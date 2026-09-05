# Dron-kod o'yini — to'liq arxitektura va Claude Code prompti

Bu hujjat ikki qismdan iborat:
1. **To'liq arxitektura** — modellar, API, frontend, o'yin mexanikasi, aniq o'lchamlar bilan.
2. **VS Code / Claude Code uchun tayyor prompt** — hujjat oxirida, to'g'ridan-to'g'ri copy-paste qilib ishlatish uchun.

---

## 1. G'oya (bir jumlada)

Foydalanuvchi chap tarafdagi konsolda Python kod yozadi (`move()`, `harvest()`, `cut()`, `shoot()`, `attack()` kabi funksiyalar bilan). Kod ishga tushirilganda o'ng tarafdagi 3D/izometrik maydonda dron shu kodga mos ravishda harakatlanadi, hujayralardagi obyektlarni (bug'doy, bomba va h.k.) qayta ishlaydi. Har bir noto'g'ri amal jon (life) kamaytiradi — 3 ta jon tugasa, "Lose". Bu barchasi Django asosidagi kurs tizimi (Course → Module → Lesson → **Level**) ichiga joylashgan bo'lib, foydalanuvchilar (o'quvchilar) kursga yoziladi (Enrollment + Transaction) va faqat ruxsat berilgan levellarga kira oladi — xuddi sen yuborgan admin panel misolidagi kabi (Courses, Lessons, Modules, Enrollments), faqat "Content/Article" o'rniga endi **o'ynaladigan Level** bor.

---

## 2. Texnologik stek

| Qatlam | Texnologiya | Sabab |
|---|---|---|
| Backend | Django 5 + Django REST Framework | Sendagi mavjud admin tizimi bilan bir xil, tez yoziladi |
| DB | PostgreSQL | JSONField'lar uchun ideal (level konfiguratsiyasi) |
| Auth | Django auth + JWT (`djangorestframework-simplejwt`) | SPA frontend uchun token kerak |
| To'lov | Click / Payme webhook | Enrollment avtomatik yaratish uchun |
| Frontend | Vanilla JS yoki React (SPA) | Alohida frontend, Django faqat API+admin |
| Kod muharriri | CodeMirror 6 | Python highlight, yengil |
| Python bajarish | Pyodide (Web Worker ichida) | Brauzerda xavfsiz Python |
| Render | PixiJS (2.5D izometrik) yoki Three.js (to'liq 3D) | Rasmlaringdagi izometrik ko'rinish uchun PixiJS yetarli va yengilroq |

---

## 3. Papka strukturasi

```
project-root/
├── backend/
│   ├── manage.py
│   ├── config/                     # settings, urls, wsgi
│   ├── apps/
│   │   ├── accounts/                # custom User model
│   │   ├── content/                 # Course, Module, Lesson, Level
│   │   ├── billing/                  # Transaction, Enrollment
│   │   ├── progress/                 # UserLevelProgress
│   │   └── api/                       # DRF viewsets/serializers/permissions
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── src/
    │   ├── editor/                   # CodeMirror wrapper
    │   ├── runtime/                  # Pyodide loader + Web Worker + function bindings
    │   ├── game/                     # PixiJS scene, drone sprite, grid renderer
    │   ├── engine/                   # Command queue, step executor, life/win logic
    │   ├── api/                      # fetch wrapper (auth, levels, submit)
    │   └── main.js
    └── package.json
```

---

## 4. Django modellari (to'liq)

### 4.1 `apps/accounts/models.py`

```python
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    phone = models.CharField(max_length=20, unique=True)
    telegram_username = models.CharField(max_length=64, blank=True)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)

    def __str__(self):
        return self.telegram_username or self.username
```

### 4.2 `apps/content/models.py`

```python
from django.db import models

class Course(models.Model):
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cover_image = models.ImageField(upload_to="courses/", blank=True, null=True)
    is_published = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.title


class Module(models.Model):
    course = models.ForeignKey(Course, related_name="modules", on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.course.title} / {self.title}"


class Lesson(models.Model):
    module = models.ForeignKey(Module, related_name="lessons", on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.title


class Level(models.Model):
    lesson = models.ForeignKey(Lesson, related_name="levels", on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)

    # o'yin maydoni: hujayralar ro'yxati, kvadrat bo'lishi shart emas
    # misol: [{"x":0,"y":0,"type":"grass"}, {"x":2,"y":3,"type":"wheat"}]
    grid_cells = models.JSONField()

    drone_start_x = models.IntegerField(default=0)
    drone_start_y = models.IntegerField(default=0)
    drone_start_facing = models.CharField(
        max_length=10,
        choices=[("north", "North"), ("south", "South"), ("east", "East"), ("west", "West")],
        default="east",
    )

    # shu level'da ochiq bo'lgan funksiyalar: ["move","harvest","shoot"]
    available_functions = models.JSONField(default=list)

    starter_code = models.TextField(blank=True)

    # misol: {"type": "all_wheat_harvested"} yoki {"type":"reach_position","x":3,"y":3}
    win_condition = models.JSONField()

    max_lives = models.PositiveSmallIntegerField(default=3)
    max_steps = models.PositiveIntegerField(default=200)

    # {"3": 20, "2": 40, "1": 999}  -> shu qadamgacha bajarsa nechta yulduz
    stars_thresholds = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.lesson.title} / {self.title}"
```

### 4.3 `apps/billing/models.py`

```python
from django.conf import settings
from django.db import models

class Transaction(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
    ]
    PROVIDER_CHOICES = [("click", "Click"), ("payme", "Payme")]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    provider_transaction_id = models.CharField(max_length=128, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} — {self.amount} — {self.status}"


class Enrollment(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="enrollments", on_delete=models.CASCADE)
    course = models.ForeignKey("content.Course", related_name="enrollments", on_delete=models.CASCADE)
    transaction = models.ForeignKey(Transaction, null=True, blank=True, on_delete=models.SET_NULL)
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "course")

    def __str__(self):
        return f"{self.user} -> {self.course}"
```

### 4.4 `apps/progress/models.py`

```python
from django.conf import settings
from django.db import models

class UserLevelProgress(models.Model):
    STATUS_CHOICES = [
        ("locked", "Locked"),
        ("unlocked", "Unlocked"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="level_progress", on_delete=models.CASCADE)
    level = models.ForeignKey("content.Level", related_name="user_progress", on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="locked")
    last_code = models.TextField(blank=True)
    attempts = models.PositiveIntegerField(default=0)
    stars = models.PositiveSmallIntegerField(default=0)
    best_steps = models.PositiveIntegerField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "level")

    def __str__(self):
        return f"{self.user} — {self.level} — {self.status}"
```

---

## 5. Ruxsat (access control) logikasi — aniq qoidalar

1. `Course.price == 0` bo'lsa — har qanday login qilgan foydalanuvchi barcha levellarga kira oladi (Enrollment shart emas).
2. `Course.price > 0` bo'lsa — foydalanuvchi uchun `Enrollment(user=user, course=course)` mavjud bo'lishi **shart**, aks holda API `403 Forbidden` qaytaradi.
3. Level ochiqligi (unlocked): lesson ichidagi levellar **ketma-ket** ochiladi — birinchi level har doim ochiq, keyingi level faqat oldingisi `UserLevelProgress.status == "completed"` bo'lsa ochiladi.
4. DRF permission class:

```python
# apps/api/permissions.py
from rest_framework.permissions import BasePermission

class CanAccessLevel(BasePermission):
    def has_object_permission(self, request, view, level):
        course = level.lesson.module.course
        if course.price == 0:
            return True
        return course.enrollments.filter(user=request.user).exists()
```

---

## 6. REST API — to'liq endpoint ro'yxati

| Method | URL | Vazifasi |
|---|---|---|
| POST | `/api/auth/login/` | JWT token olish |
| GET | `/api/courses/` | Nashr qilingan kurslar ro'yxati (narx, enrollment holati bilan) |
| GET | `/api/courses/{slug}/` | Kurs ichidagi module/lesson/level daraxti (nom + lock holati) |
| GET | `/api/levels/{id}/` | Level'ning **to'liq konfiguratsiyasi** (faqat ruxsat bo'lsa) |
| POST | `/api/levels/{id}/attempt/` | Urinish natijasini yuborish (pastda formatini ko'r) |
| POST | `/api/enrollments/` | To'lovdan keyin enrollment yaratish |
| POST | `/api/payments/click/webhook/` | Click to'lov tasdig'i |
| POST | `/api/payments/payme/webhook/` | Payme to'lov tasdig'i |

**`POST /api/levels/{id}/attempt/` request body:**

```json
{
  "code": "while True:\n    harvest()\n    move(East)",
  "result": "completed",
  "steps_used": 18,
  "lives_left": 2,
  "error_log": []
}
```

Backend shu ma'lumot asosida `UserLevelProgress`ni yangilaydi va `stars_thresholds`ga qarab yulduz hisoblaydi.

---

## 7. Level JSON formati (frontend backenddan shu ko'rinishda oladi)

```json
{
  "id": 5,
  "title": "Bug'doy o'rish",
  "grid_cells": [
    {"x": 0, "y": 0, "type": "grass"},
    {"x": 1, "y": 0, "type": "wheat"},
    {"x": 2, "y": 3, "type": "bomb"}
  ],
  "drone_start": {"x": 0, "y": 0, "facing": "east"},
  "available_functions": ["move", "harvest", "shoot"],
  "starter_code": "while True:\n    move(East)",
  "win_condition": {"type": "all_wheat_harvested"},
  "max_lives": 3,
  "max_steps": 200
}
```

---

## 8. Frontend arxitekturasi — aniq o'lchamlar bilan

**Layout (1280px+ ekran uchun asosiy holat):**

- Chap panel: kengligi **450px**, konsol balandligi **550px**, konsol ustida **40px** balandlikdagi toolbar (`Run`, `Stop`, `Restart` tugmalari, chapdan o'ngga tartibda).
- O'ng panel: qolgan bo'sh joy (min. 750px keng), yuqorida o'yin maydoni (canvas, taxminan **800x500px**), pastida **80px** balandlikdagi "resurslar" paneli — mavjud funksiyalar va joniy hayot (❤️❤️❤️) ko'rsatiladi.
- Mobil ekran (<768px): panellar vertikal stack bo'ladi — avval o'yin maydoni, keyin konsol (bu birinchi versiyada ixtiyoriy, MVP desktop-first bo'lishi mumkin).

**Ishlash oqimi (`Run` bosilganda):**

1. Kod matni CodeMirror'dan olinadi.
2. Kod Web Worker ichidagi Pyodide'ga yuboriladi.
3. Pyodide global namespace'iga bog'langan funksiyalar (`move`, `harvest`, `shoot`...) chaqirilganda, ular darhol harakat qilmaydi — **buyruqlar navbatiga** (`commandQueue.push({type:"move", dir:"east"})`) qo'shiladi.
4. `max_steps` chegarasiga yetganda yoki kod tugaganda, Worker natijani asosiy threadga qaytaradi.
5. Asosiy thread `commandQueue`ni birma-bir, har biri **400ms** animatsiya bilan bajaradi:
   - Har bir buyruq **Level Engine** orqali tekshiriladi (pastdagi 9-bo'lim).
   - Muvaffaqiyatli bo'lsa — dron animatsiyasi ijro etiladi, PixiJS sahna yangilanadi.
   - Xato bo'lsa — jon kamayadi, ekranda qisqa xato animatsiyasi (masalan qizil chaqnash) ko'rsatiladi.
6. `win_condition` bajarilsa — "Win" ekrani, yulduzlar bilan. Jon 0 ga tushsa — "Lose" ekrani, sabab bilan (masalan: "3-qatorda bo'sh joyni kesishga urinding").

**`Restart` tugmasi**: `commandQueue`ni tozalaydi, drone'ni `drone_start` holatiga qaytaradi, grid'ni asl holatiga tiklaydi, jonlarni `max_lives`ga qaytaradi — lekin konsoldagi kodni **o'chirmaydi**.

---

## 9. Level Engine — xato va g'alaba qoidalari (aniq)

Har bir buyruq uchun aniq tekshiruv:

| Buyruq | Muvaffaqiyat sharti | Xato holati (jon -1) |
|---|---|---|
| `move(direction)` | Yo'nalishdagi hujayra grid ichida va bo'sh/o'tish mumkin | Grid chegarasidan tashqari yoki to'siq bor |
| `harvest()` / `cut()` | Joriy hujayrada `type == "wheat"` | Hujayrada bug'doy yo'q |
| `shoot()` | Qaralayotgan yo'nalishdagi hujayrada `type == "bomb"` | Bombasiz hujayraga otish |
| `plant(entity)` | Hujayra bo'sh (`type == "grass"`) | Band hujayraga ekish |

`win_condition.type` variantlari: `all_wheat_harvested`, `all_bombs_destroyed`, `reach_position`, `survive_n_steps`. Har birini alohida funksiya sifatida Level Engine'da tekshirish kerak.

---

## 10. Admin panel

Django admin'da (sen yuborgan misoldagi kabi) quyidagilar bo'ladi:

- `Course`, `Module`, `Lesson` — oddiy `ModelAdmin`, `list_display`, `ordering` bilan.
- `Level` — `grid_cells`, `win_condition`, `available_functions` maydonlari uchun **`django-json-widget`** o'rnatish tavsiya etiladi (JSON'ni qo'lda formatlab yozish o'rniga qulay editor beradi). Keyingi versiyada — vizual grid tuzuvchi (hujayralarni sichqoncha bilan belgilab "wheat/bomb/grass" tanlash) alohida custom admin view sifatida qo'shiladi.
- `Enrollment` — sendagi rasmdagi kabi (`User`, `Course`, `Transaction` autocomplete maydonlari bilan).
- `Transaction` — to'lov holatini kuzatish uchun `list_filter=["status","provider"]`.

---

## 11. Qurish tartibi (build order)

1. Django loyihasi + 4 ta app (`accounts`, `content`, `billing`, `progress`) + modellar + migratsiya + admin ro'yxatdan o'tkazish.
2. DRF serializers/viewsets + JWT auth + `CanAccessLevel` permission.
3. Frontend skelet: CodeMirror konsol (450x550px) + Run/Stop/Restart tugmalari, hali o'yinsiz — faqat kod ishlaydi va natija konsolga chiqadi.
4. Pyodide integratsiyasi Web Worker ichida, `move`/`harvest`/`shoot` funksiyalarini JS callback'larga bog'lash, buyruqlar navbatini konsolga log qilish (hali render yo'q).
5. PixiJS bilan grid + dron render, buyruqlar navbatini animatsiya bilan ijro etish.
6. Level Engine: xato/g'alaba tekshiruvi, jon tizimi, Win/Lose ekranlari.
7. Backend bilan bog'lash: level'ni API'dan olish, urinish natijasini yuborish.
8. Enrollment + to'lov (Click/Payme webhook) integratsiyasi.
9. Admin panelga JSON widget qo'shish, birinchi 3-5 ta haqiqiy level yaratish.

---

## 12. VS Code / Claude Code uchun tayyor prompt

Quyidagi blokni to'liq copy qilib, Claude Code'ga (yoki boshqa AI coding assistant'ga) birinchi xabar sifatida yuborish mumkin — u yuqoridagi barcha kontekstni o'z ichiga oladi.

```
LOYIHA: Brauzerda ishlaydigan "kod yozib dronni boshqarish" ta'lim o'yini + Django LMS backend.

G'OYA:
Foydalanuvchi chap tarafdagi kod konsolida (kenglik 450px, balandlik 550px, ustida
Run/Stop/Restart tugmalari) Python kod yozadi. Kod move(), harvest(), cut(), shoot(),
attack(), plant() kabi tayyor funksiyalarni chaqiradi. "Run" bosilganda kod brauzerda
Pyodide orqali bajariladi (Web Worker ichida, cheksiz sikllardan himoya uchun har bir
level uchun max_steps chegarasi bilan). Har bir funksiya chaqiruvi darhol bajarilmaydi,
"buyruqlar navbati"ga yoziladi va keyin 400ms animatsiya bilan birma-bir ijro etiladi.

O'ng tarafda o'yin maydoni bor: grid variable shakldagi hujayralar ro'yxati (har doim
to'g'ri to'rtburchak/4x4 emas), yuqorida dron, hujayralarda turli obyektlar (masalan
"wheat" - bug'doy, "bomb" - portlaydigan shar, "grass" - bo'sh joy).

O'YIN MEXANIKASI:
- Dronda max_lives (odatda 3) joni bor.
- Har bir buyruq Level Engine orqali tekshiriladi: masalan harvest() faqat "wheat"
  turidagi hujayrada muvaffaqiyatli, aks holda jon -1.
- move() grid chegarasidan tashqariga yoki to'siqqa borsa - jon -1.
- shoot() faqat "bomb" hujayrasida muvaffaqiyatli.
- Jon 0 ga tushsa - "Lose", sababini aniq ko'rsatish kerak (qaysi amal xato berdi).
- win_condition turlari: all_wheat_harvested, all_bombs_destroyed, reach_position,
  survive_n_steps - level konfiguratsiyasida JSON orqali belgilanadi.
- Yutganda bajarilgan qadamlar soniga qarab 1-3 yulduz beriladi (stars_thresholds).

BACKEND (Django + DRF + PostgreSQL):
Modellar: Course -> Module -> Lesson -> Level (Level ichida grid_cells JSONField,
drone_start, available_functions JSONField, starter_code, win_condition JSONField,
max_lives, max_steps, stars_thresholds). Alohida: Enrollment (user, course,
transaction) va Transaction (Click/Payme uchun) - pullik kurslarga ruxsat shu orqali
beriladi. UserLevelProgress (user, level, status, last_code, attempts, stars,
best_steps) - progressni saqlaydi va levellarni ketma-ket ochadi (oldingi level
completed bo'lmaguncha keyingisi locked).

Ruxsat qoidasi: agar Course.price == 0 - hamma kira oladi; aks holda foydalanuvchi
uchun Enrollment mavjudligi tekshiriladi (403 aks holda).

API: GET /api/courses/, GET /api/courses/{slug}/, GET /api/levels/{id}/ (ruxsat
tekshirib to'liq JSON qaytaradi), POST /api/levels/{id}/attempt/ (natija yuboriladi:
code, result, steps_used, lives_left), POST /api/enrollments/, to'lov webhooklar.

Django admin: barcha modellar ro'yxatdan o'tkazilgan bo'lsin, Level uchun JSON
maydonlarni qulay tahrirlash uchun django-json-widget ishlatilsin.

FRONTEND:
Alohida SPA (vanilla JS yoki React), backend faqat API+admin sifatida ishlaydi.
- CodeMirror 6 - kod muharriri, Python syntax highlighting.
- Pyodide - Web Worker ichida, move/harvest/shoot/attack/plant funksiyalari Python
  global namespace'iga JS callback sifatida bog'langan; har chaqiruv buyruqlar
  navbatiga yoziladi, darhol bajarilmaydi.
- PixiJS - izometrik/2.5D grid va dron render, buyruqlar navbatini 400ms animatsiya
  bilan ijro etadi.
- Layout: chap panel 450x550px konsol + 40px toolbar (Run/Stop/Restart), o'ng panelda
  ~800x500px o'yin maydoni va pastida 80px resurslar/jon paneli.

QURISH TARTIBI (shu ketma-ketlikda bosqichma-bosqich ishla, har bosqichdan keyin
ishlashini tekshirib ber):
1. Django loyihasi, 4 app (accounts, content, billing, progress), modellar, admin.
2. DRF serializers/viewsets, JWT auth, CanAccessLevel permission.
3. Frontend skelet: faqat CodeMirror konsol + Run tugmasi, natija konsolga log bo'lsin.
4. Pyodide + Web Worker integratsiyasi, funksiya bog'lash, buyruqlar navbati logi.
5. PixiJS grid + dron render, navbatni animatsiya bilan ijro etish.
6. Level Engine: xato/g'alaba tekshiruvi, jon tizimi, Win/Lose ekranlari.
7. Backend bilan bog'lash (level olish, attempt yuborish).
8. Enrollment + to'lov integratsiyasi.

Har bir bosqichni alohida-alohida amalga oshir, keyingisiga o'tishdan oldin ishlab
turganini tasdiqla. Savol tug'ilsa, taxmin qilib davom etishdan oldin so'ra.
```

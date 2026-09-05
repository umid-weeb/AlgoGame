import React from 'react'
import './FlightInfo.css'

const COPY = {
  en: {
    title: 'Flight manual',
    intro: 'Write real Python. Use loops, conditions, variables, and your own functions to plan the mission.',
    safety: 'Your code runs in a safe game sandbox. It can control the drone and world, but cannot access your files or network.',
    close: 'Close manual',
    language: 'Language',
    functions: 'Game API',
    examples: 'Useful patterns',
    pattern: 'def harvest_row():\n    harvest()\n    move(EAST)',
  },
  uz: {
    title: 'Parvoz qo‘llanmasi',
    intro: 'Haqiqiy Python yozing. Sikl, shart, o‘zgaruvchi va o‘zingiz yaratgan funksiyalar bilan missiyani boshqaring.',
    safety: 'Kodingiz xavfsiz game sandbox ichida ishlaydi. Dron va game world boshqariladi, lekin kompyuter fayllari va internetga kirilmaydi.',
    close: 'Qo‘llanmani yopish',
    language: 'Til',
    functions: 'Game API',
    examples: 'Foydali namuna',
    pattern: 'def harvest_row():\n    harvest()\n    move(EAST)',
  },
}

const FUNCTIONS = [
  ['move(direction)', 'Move one tile in NORTH, SOUTH, EAST or WEST.'],
  ['takeoff()', 'Lift the drone above the map.'],
  ['land()', 'Land the drone on its current tile.'],
  ['turn_left() / turn_right()', 'Rotate the drone without changing position.'],
  ['hover()', 'Keep position and spend one simulation step.'],
  ['harvest()', 'Collect wheat from the current tile.'],
  ['cut()', 'Remove a tree or bush from the current tile.'],
  ['shoot()', 'Destroy a bomb in the facing direction.'],
  ['plant(entity)', 'Plant an entity such as "wheat" on grass.'],
]

export default function FlightInfo({ language, onLanguageChange, onClose }) {
  const copy = COPY[language]

  return (
    <div className="info-backdrop" role="presentation" onClick={onClose}>
      <aside className="flight-info" role="dialog" aria-modal="true" aria-labelledby="flight-info-title" onClick={(event) => event.stopPropagation()}>
        <div className="info-topline">
          <div>
            <span className="info-kicker">DRONECODE / MANUAL</span>
            <h2 id="flight-info-title">{copy.title}</h2>
          </div>
          <button className="info-close" type="button" onClick={onClose} aria-label={copy.close}>×</button>
        </div>
        <div className="language-switcher" aria-label={copy.language}>
          <span>{copy.language}</span>
          <button type="button" className={language === 'uz' ? 'active' : ''} onClick={() => onLanguageChange('uz')}>UZ</button>
          <button type="button" className={language === 'en' ? 'active' : ''} onClick={() => onLanguageChange('en')}>EN</button>
        </div>
        <p className="info-intro">{copy.intro}</p>
        <div className="info-safety">{copy.safety}</div>
        <section>
          <h3>{copy.functions}</h3>
          <div className="function-definitions">
            {FUNCTIONS.map(([name, definition]) => <div key={name} className="function-definition"><code>{name}</code><span>{language === 'uz' ? translateDefinition(name) : definition}</span></div>)}
          </div>
        </section>
        <section>
          <h3>{copy.examples}</h3>
          <pre>{copy.pattern}</pre>
        </section>
        <button className="manual-close-button" type="button" onClick={onClose}>{copy.close}</button>
      </aside>
    </div>
  )
}

function translateDefinition(name) {
  const definitions = {
    'move(direction)': 'Dronni NORTH, SOUTH, EAST yoki WEST tomonga bir katak yurgizadi.',
    'takeoff()': 'Dronni xarita ustiga ko‘taradi.',
    'land()': 'Dronni hozirgi katakka qo‘ndiradi.',
    'turn_left() / turn_right()': 'Joyidan siljitmasdan dronni buradi.',
    'hover()': 'Joyida turadi va bitta simulation qadam sarflaydi.',
    'harvest()': 'Hozirgi katakdagi bug‘doyni yig‘adi.',
    'cut()': 'Hozirgi katakdagi daraxt yoki butani olib tashlaydi.',
    'shoot()': 'Dron qaragan yo‘nalishdagi bombani yo‘q qiladi.',
    'plant(entity)': 'Grass katakka entity, masalan "wheat", ekadi.',
  }
  return definitions[name]
}
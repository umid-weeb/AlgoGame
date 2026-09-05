# Generated manually for the new educational-runtime default.
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='level',
            name='max_steps',
            field=models.PositiveIntegerField(default=1000),
        ),
    ]

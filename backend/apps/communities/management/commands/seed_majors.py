from django.core.management.base import BaseCommand
from apps.communities.models import Major


class Command(BaseCommand):
    help = 'Seed the university majors (filières)'

    def handle(self, *args, **options):
        majors = [
            {'name': 'Informatique', 'code': 'INFO', 'description': 'Sciences informatiques, développement, réseaux et systèmes', 'order': 1},
            {'name': 'Droit', 'code': 'DROIT', 'description': 'Droit privé, public, affaires et international', 'order': 2},
            {'name': 'Marketing', 'code': 'MKT', 'description': 'Marketing digital, communication et stratégie commerciale', 'order': 3},
            {'name': 'Gestion', 'code': 'GEST', 'description': 'Gestion d\'entreprise, management et ressources humaines', 'order': 4},
            {'name': 'Économie', 'code': 'ECO', 'description': 'Sciences économiques, finance et analyse de marchés', 'order': 5},
            {'name': 'Communication', 'code': 'COM', 'description': 'Communication média, relations publiques et journalisme', 'order': 6},
            {'name': 'Psychologie', 'code': 'PSY', 'description': 'Psychologie clinique, sociale et du travail', 'order': 7},
            {'name': 'Langues & Cultures', 'code': 'LANG', 'description': 'Langues étrangères, traduction et études culturelles', 'order': 8},
        ]
        created = 0
        for data in majors:
            obj, was_created = Major.objects.get_or_create(
                code=data['code'],
                defaults=data
            )
            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f'  + {obj.name}'))
            else:
                self.stdout.write(f'  = {obj.name} (déjà présent)')
        self.stdout.write(self.style.SUCCESS(f'\n{created} filière(s) créée(s).'))

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import AIServiceError, generate_challenge


class GenerateChallengeView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        data = request.data
        required = ('topic', 'difficulty')
        missing = [field for field in required if not data.get(field)]
        if missing:
            return Response({'error': f'Missing fields: {", ".join(missing)}'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            challenge, errors = generate_challenge(
                topic=data['topic'],
                difficulty=data['difficulty'],
                map_complexity=data.get('map_complexity', 'irregular'),
                required_functions=data.get('required_functions', ['move']),
                constraints=data.get('constraints', 'Must be solvable and educational.'),
                user=request.user,
            )
        except AIServiceError as error:
            return Response({'error': str(error)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({
            'id': challenge.id,
            'status': challenge.status,
            'payload': challenge.payload,
            'validation_errors': errors,
            'provider': challenge.provider,
            'model': challenge.model,
        }, status=status.HTTP_201_CREATED)

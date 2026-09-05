import json
import os
import urllib.error
import urllib.request

from .models import AIProviderConfig


DEFAULT_SYSTEM_PROMPT = '''You are DroneCode's level designer. Generate educational Python programming challenges.
Return only valid JSON, with no markdown fences. The payload must be solvable and use this schema:
{
  "title": string,
  "description": string,
  "grid_cells": [{"x": integer, "y": integer, "type": "grass|wheat|tree|bush|rock|water|wall|bomb"}],
  "drone_start": {"x": integer, "y": integer, "facing": "north|south|east|west"},
  "available_functions": [string],
  "starter_code": string,
  "win_condition": {"type": "all_wheat_harvested|all_bombs_destroyed|reach_position|survive_n_steps", "x": integer, "y": integer, "steps": integer},
  "max_lives": integer,
  "max_steps": integer,
  "stars_thresholds": {"steps": integer}
}
Teach the requested topic. Use irregular, puzzle-like maps when requested. Do not publish or invent unsafe real-world drone instructions.'''


class AIServiceError(Exception):
    pass


class ProviderClient:
    def __init__(self, config):
        self.config = config
        self.api_key = os.getenv(config.api_key_env, '')
        if not self.api_key:
            raise AIServiceError(f'Missing API key environment variable: {config.api_key_env}')

    def generate(self, user_prompt):
        provider = self.config.provider
        if provider == 'anthropic':
            return self._anthropic(user_prompt)
        if provider == 'gemini':
            return self._gemini(user_prompt)
        return self._openai_compatible(user_prompt)

    def _anthropic(self, prompt):
        body = {
            'model': self.config.model,
            'max_tokens': self.config.max_output_tokens,
            'temperature': self.config.temperature,
            'system': self.config.system_prompt or DEFAULT_SYSTEM_PROMPT,
            'messages': [{'role': 'user', 'content': prompt}],
        }
        data = self._request(
            self.config.base_url or 'https://api.anthropic.com/v1/messages',
            body,
            {'x-api-key': self.api_key, 'anthropic-version': '2023-06-01'},
        )
        return data['content'][0]['text']

    def _openai_compatible(self, prompt):
        body = {
            'model': self.config.model,
            'temperature': self.config.temperature,
            'max_tokens': self.config.max_output_tokens,
            'messages': [
                {'role': 'system', 'content': self.config.system_prompt or DEFAULT_SYSTEM_PROMPT},
                {'role': 'user', 'content': prompt},
            ],
        }
        data = self._request(
            self.config.base_url or 'https://api.groq.com/openai/v1/chat/completions',
            body,
            {'Authorization': f'Bearer {self.api_key}'},
        )
        return data['choices'][0]['message']['content']

    def _gemini(self, prompt):
        url = self.config.base_url or f'https://generativelanguage.googleapis.com/v1beta/models/{self.config.model}:generateContent'
        body = {
            'system_instruction': {'parts': [{'text': self.config.system_prompt or DEFAULT_SYSTEM_PROMPT}]},
            'contents': [{'parts': [{'text': prompt}]}],
            'generationConfig': {'temperature': self.config.temperature, 'maxOutputTokens': self.config.max_output_tokens},
        }
        data = self._request(f'{url}?key={self.api_key}', body, {})
        return data['candidates'][0]['content']['parts'][0]['text']

    @staticmethod
    def _request(url, body, headers):
        request = urllib.request.Request(
            url,
            data=json.dumps(body).encode('utf-8'),
            headers={'Content-Type': 'application/json', **headers},
            method='POST',
        )
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return json.loads(response.read().decode('utf-8'))
        except (urllib.error.URLError, urllib.error.HTTPError) as error:
            raise AIServiceError(f'AI provider request failed: {error}') from error


def get_active_client():
    config = AIProviderConfig.objects.filter(enabled=True).order_by('-updated_at').first()
    if not config:
        raise AIServiceError('No enabled AI provider configuration exists. Configure one in Django Admin.')
    return config, ProviderClient(config)


def parse_json_response(text):
    cleaned = text.strip()
    if cleaned.startswith('```'):
        cleaned = cleaned.split('\n', 1)[1].rsplit('```', 1)[0].strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as error:
        raise AIServiceError('AI returned invalid JSON.') from error


def validate_challenge(payload):
    """Validate untrusted model output before an admin can approve it.

    This intentionally validates game rules locally instead of trusting a model
    claim that a level is solvable.
    """
    if not isinstance(payload, dict):
        return ['AI response must be a JSON object.']

    required = ('title', 'grid_cells', 'drone_start', 'available_functions', 'starter_code', 'win_condition', 'max_lives', 'max_steps')
    errors = [f'Missing field: {field}' for field in required if field not in payload]
    cells = payload.get('grid_cells', [])
    if not isinstance(cells, list) or not cells:
        errors.append('grid_cells must be a non-empty list.')
        return errors

    allowed_types = {'grass', 'wheat', 'tree', 'bush', 'rock', 'water', 'wall', 'bomb'}
    coordinates = set()
    for cell in cells:
        if not isinstance(cell, dict) or cell.get('type') not in allowed_types or not isinstance(cell.get('x'), int) or not isinstance(cell.get('y'), int):
            errors.append('Every grid cell must have a supported type.')
            break
        coordinate = (cell['x'], cell['y'])
        if coordinate in coordinates:
            errors.append(f'Duplicate grid cell at {coordinate}.')
            break
        coordinates.add(coordinate)

    drone = payload.get('drone_start', {})
    if not isinstance(drone, dict) or (drone.get('x'), drone.get('y')) not in coordinates:
        errors.append('drone_start must be on an existing grid cell.')
    elif drone.get('facing') not in {'north', 'south', 'east', 'west'}:
        errors.append('drone_start.facing must be north, south, east, or west.')

    functions = payload.get('available_functions', [])
    if not isinstance(functions, list) or 'move' not in functions:
        errors.append('available_functions must include move.')
    if not isinstance(payload.get('starter_code', ''), str):
        errors.append('starter_code must be a string.')
    if not isinstance(payload.get('max_lives'), int) or payload.get('max_lives', 0) < 1:
        errors.append('max_lives must be at least 1.')
    if not isinstance(payload.get('max_steps'), int) or payload.get('max_steps', 0) < 1:
        errors.append('max_steps must be at least 1.')

    condition = payload.get('win_condition', {})
    condition_type = condition.get('type') if isinstance(condition, dict) else None
    valid_conditions = {'all_wheat_harvested', 'all_bombs_destroyed', 'reach_position', 'survive_n_steps'}
    if condition_type not in valid_conditions:
        errors.append('win_condition.type is unsupported.')
    if condition_type == 'all_wheat_harvested' and not any(isinstance(cell, dict) and cell.get('type') == 'wheat' for cell in cells):
        errors.append('Harvest objective requires at least one wheat tile.')
    if condition_type == 'all_bombs_destroyed' and not any(isinstance(cell, dict) and cell.get('type') == 'bomb' for cell in cells):
        errors.append('Bomb objective requires at least one bomb tile.')
    if condition_type == 'reach_position' and (condition.get('x'), condition.get('y')) not in coordinates:
        errors.append('reach_position target must be on an existing grid cell.')
    if condition_type == 'survive_n_steps' and (not isinstance(condition.get('steps'), int) or condition['steps'] < 1):
        errors.append('survive_n_steps requires a positive steps value.')

    # Traverse only tiles a drone can occupy. Missing cells represent holes in
    # an irregular puzzle map and are deliberately not traversable.
    blocked = {'water', 'wall', 'rock'}
    by_coordinate = {
        (cell['x'], cell['y']): cell['type']
        for cell in cells
        if isinstance(cell, dict) and isinstance(cell.get('x'), int) and isinstance(cell.get('y'), int) and cell.get('type') in allowed_types
    }
    start = (drone.get('x'), drone.get('y')) if isinstance(drone, dict) else None
    reachable = set()
    if start in by_coordinate and by_coordinate[start] not in blocked:
        frontier = [start]
        reachable.add(start)
        while frontier:
            x, y = frontier.pop()
            for point in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if point not in reachable and point in by_coordinate and by_coordinate[point] not in blocked:
                    reachable.add(point)
                    frontier.append(point)

    targets = []
    if condition_type == 'all_wheat_harvested':
        targets = [point for point, tile in by_coordinate.items() if tile == 'wheat']
    elif condition_type == 'reach_position':
        targets = [(condition.get('x'), condition.get('y'))]
    if any(target not in reachable for target in targets):
        errors.append('Level is unsolvable: an objective tile cannot be reached from drone_start.')
    return errors


def generate_challenge(*, topic, difficulty, map_complexity, required_functions, constraints, user):
    config, client = get_active_client()
    prompt = f'''Create one DroneCode challenge.
Topic: {topic}
Difficulty: {difficulty}
Map complexity: {map_complexity}
Required functions: {required_functions}
Constraints: {constraints}
Return only the requested JSON payload.'''
    payload = parse_json_response(client.generate(prompt))
    errors = validate_challenge(payload)
    from .models import GeneratedChallenge
    challenge = GeneratedChallenge.objects.create(
        title=payload.get('title', 'Untitled challenge'),
        topic=topic,
        difficulty=difficulty,
        prompt=prompt,
        payload=payload,
        validation_errors=errors,
        provider=config.provider,
        model=config.model,
        created_by=user,
    )
    return challenge, errors

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from analytics.models import Zone, SimulationRun
from analytics.simulation_engine import simulation_engine
from analytics.views import seed_default_smart_site_data

User = get_user_model()

class SimulationEngineTests(TestCase):
    def setUp(self):
        seed_default_smart_site_data()
        self.user = User.objects.create_user(username='admin_test', email='admin@test.com', password='password123', role='admin')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.zone_a = Zone.objects.filter(code='ZONE-BADA-A').first()

    def test_seed_data_created(self):
        self.assertIsNotNone(self.zone_a)
        self.assertEqual(self.zone_a.location_name, "Bada Danda")
        self.assertTrue(self.zone_a.connected_zones.exists())

    def test_simulation_engine_run(self):
        res = simulation_engine.run_simulation(
            primary_zone_id=self.zone_a.id,
            scenario_type='entry_restriction',
            duration_minutes=15,
            intensity='medium',
            user=self.user
        )
        self.assertIn('simulated_zones', res)
        self.assertIn('ripple_effect', res)
        self.assertIn('recommendation', res)
        self.assertEqual(res['provenance']['result_label'], 'SIMULATED CHANGE')
        self.assertEqual(SimulationRun.objects.count(), 1)

    def test_compare_actions(self):
        res = simulation_engine.compare_actions(
            primary_zone_id=self.zone_a.id,
            duration_minutes=15,
            user=self.user
        )
        self.assertIn('action_comparisons', res)
        self.assertIn('simulated_lowest_risk_option', res)
        self.assertEqual(len(res['action_comparisons']), 3)

    def test_run_simulation_api(self):
        response = self.client.post('/api/analytics/simulation/run/', {
            'primary_zone_id': self.zone_a.id,
            'scenario_type': 'entry_restriction',
            'duration_minutes': 15,
            'intensity': 'high'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('simulated_zones', response.data)

    def test_compare_actions_api(self):
        response = self.client.post('/api/analytics/simulation/compare/', {
            'primary_zone_id': self.zone_a.id,
            'duration_minutes': 15
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('simulated_lowest_risk_option', response.data)

    def test_visitor_safety_api(self):
        response = self.client.get('/api/analytics/visitor/safety/?location=Bada Danda&lang=or')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['language'], 'or')
        self.assertIn('guidance', response.data)
        self.assertEqual(response.data['provenance']['source'], 'Manual Image / Simulated Camera Input')

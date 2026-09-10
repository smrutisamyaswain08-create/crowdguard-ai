import json
import random
from analytics.models import Zone, SimulationRun

class WhatIfSimulationEngine:
    """
    Simulation Engine for AI Crowd Digital Twin & What-If Safety Simulator.
    Simulates crowd flow redistribution, ripple effects across connected zones,
    risk shifts, and generates transparent decision-support recommendations.
    """

    SCENARIO_PROFILES = {
        'entry_restriction': {
            'name': 'Gate / Entry Restriction',
            'primary_inflow_factor': 0.15,   # -85% inflow to primary zone
            'primary_outflow_factor': 1.10,  # Outflow continues normally
            'secondary_spillover_factor': 0.45, # 45% of diverted crowd shifts to connected zones
            'downstream_spillover_factor': 0.20,
            'description': 'Restricts incoming entry gates into the primary zone. Crowd inside clears gradually while incoming influx diverts to connected sections.'
        },
        'sudden_surge': {
            'name': 'Sudden Crowd Increase',
            'primary_inflow_factor': 1.75,   # +75% influx
            'primary_outflow_factor': 0.90,
            'secondary_spillover_factor': 0.35,
            'downstream_spillover_factor': 0.15,
            'description': 'Simulates a sudden heavy influx of visitors entering the primary zone during peak procession or arrival.'
        },
        'route_blockage': {
            'name': 'Route Blockage',
            'primary_inflow_factor': 1.10,
            'primary_outflow_factor': 0.30,  # -70% outflow due to bottleneck
            'secondary_spillover_factor': 0.50,
            'downstream_spillover_factor': 0.25,
            'description': 'Simulates physical barrier or barricade blockage in main egress route, forcing accumulation in primary zone and rerouting via secondary paths.'
        },
        'emergency_incident': {
            'name': 'Emergency Incident',
            'primary_inflow_factor': 0.05,   # Complete halt of inflow
            'primary_outflow_factor': 1.60,  # Rapid dispersion outflow
            'secondary_spillover_factor': 0.60, # Heavy sudden rush to neighboring zones
            'downstream_spillover_factor': 0.30,
            'description': 'Simulates immediate evacuation dispersion out of primary zone into adjacent connected sections.'
        },
        'visitor_diversion': {
            'name': 'Temporary Visitor Diversion',
            'primary_inflow_factor': 0.50,   # Controlled 50% reduction
            'primary_outflow_factor': 1.05,
            'secondary_spillover_factor': 0.30,
            'downstream_spillover_factor': 0.10,
            'description': 'Proactively diverts incoming visitor streams at perimeter checkpoints towards under-utilized connected zones.'
        }
    }

    INTENSITY_MULTIPLIERS = {
        'low': 0.6,
        'medium': 1.0,
        'high': 1.4,
        'critical': 1.8
    }

    @staticmethod
    def get_risk_level(occupancy_pct):
        if occupancy_pct >= 85.0:
            return 'critical'
        elif occupancy_pct >= 70.0:
            return 'high'
        elif occupancy_pct >= 50.0:
            return 'medium'
        else:
            return 'low'

    def run_simulation(self, primary_zone_id, scenario_type='entry_restriction', duration_minutes=15, intensity='medium', user=None):
        """
        Executes a What-If crowd safety simulation for a specified zone, scenario, duration, and intensity.
        Calculates exact before/after occupancy, ripple effect on connected zones, and simulation-based recommendations.
        """
        try:
            primary_zone = Zone.objects.get(id=primary_zone_id)
        except Zone.DoesNotExist:
            raise ValueError(f"Zone with ID {primary_zone_id} does not exist.")

        profile = self.SCENARIO_PROFILES.get(scenario_type, self.SCENARIO_PROFILES['entry_restriction'])
        mult = self.INTENSITY_MULTIPLIERS.get(intensity, 1.0)
        time_factor = min(2.0, max(0.5, duration_minutes / 15.0))

        # Retrieve all active operational zones
        all_zones = list(Zone.objects.filter(is_active=True))
        if primary_zone not in all_zones:
            all_zones.append(primary_zone)

        # Build initial state dictionary
        initial_state = {}
        for z in all_zones:
            occ_pct = z.occupancy_percentage
            initial_state[str(z.id)] = {
                'id': z.id,
                'name': z.name,
                'code': z.code,
                'capacity': z.capacity_limit,
                'current_crowd': z.current_occupancy,
                'occupancy_pct': occ_pct,
                'risk_level': z.risk_level,
                'emergency_route_available': z.emergency_route_available
            }

        # 1. Primary Zone Simulation Calculation
        p_curr = primary_zone.current_occupancy
        p_cap = primary_zone.capacity_limit

        if scenario_type == 'entry_restriction':
            delta_primary = -int(p_curr * 0.25 * mult * time_factor)
        elif scenario_type == 'sudden_surge':
            delta_primary = int(p_cap * 0.35 * mult * time_factor)
        elif scenario_type == 'route_blockage':
            delta_primary = int(p_curr * 0.40 * mult * time_factor)
        elif scenario_type == 'emergency_incident':
            delta_primary = -int(p_curr * 0.55 * mult * time_factor)
        elif scenario_type == 'visitor_diversion':
            delta_primary = -int(p_curr * 0.20 * mult * time_factor)
        else:
            delta_primary = 0

        simulated_primary_crowd = max(0, p_curr + delta_primary)
        simulated_primary_occ = round((simulated_primary_crowd / p_cap) * 100, 1) if p_cap > 0 else 0
        simulated_primary_risk = self.get_risk_level(simulated_primary_occ)

        # 2. Secondary Connected Zones Simulation (Direct Neighbors)
        connected_secondary = list(primary_zone.connected_zones.filter(is_active=True))
        secondary_results = []
        secondary_ids = set(z.id for z in connected_secondary)

        # Dispersed crowd pool to distribute to connected neighbors
        diverted_pool = abs(delta_primary) if delta_primary != 0 else int(p_curr * 0.20 * mult)
        sec_share = diverted_pool // max(1, len(connected_secondary))

        for s_zone in connected_secondary:
            s_curr = s_zone.current_occupancy
            s_cap = s_zone.capacity_limit

            if scenario_type in ['entry_restriction', 'visitor_diversion', 'sudden_surge', 'emergency_incident']:
                s_delta = int(sec_share * profile['secondary_spillover_factor'] * mult)
            elif scenario_type == 'route_blockage':
                s_delta = int(sec_share * 0.8 * mult) # Heavy rerouting into unblocked neighbors
            else:
                s_delta = 0

            s_sim_crowd = max(0, s_curr + s_delta)
            s_sim_occ = round((s_sim_crowd / s_cap) * 100, 1) if s_cap > 0 else 0
            s_sim_risk = self.get_risk_level(s_sim_occ)

            secondary_results.append({
                'id': s_zone.id,
                'name': s_zone.name,
                'code': s_zone.code,
                'capacity': s_cap,
                'current_crowd': s_curr,
                'simulated_crowd': s_sim_crowd,
                'crowd_change': s_delta,
                'current_occ_pct': s_zone.occupancy_percentage,
                'simulated_occ_pct': s_sim_occ,
                'current_risk': s_zone.risk_level,
                'simulated_risk': s_sim_risk,
                'effect_level': 'SECONDARY'
            })

        # 3. Downstream Connected Zones Simulation (Connected to Secondary Zones, excluding Primary)
        downstream_ids = set()
        downstream_zones = []
        for s_zone in connected_secondary:
            for d_zone in s_zone.connected_zones.filter(is_active=True):
                if d_zone.id != primary_zone.id and d_zone.id not in secondary_ids and d_zone.id not in downstream_ids:
                    downstream_ids.add(d_zone.id)
                    downstream_zones.append(d_zone)

        downstream_results = []
        downstream_share = diverted_pool // max(1, len(downstream_zones)) if downstream_zones else 0

        for d_zone in downstream_zones:
            d_curr = d_zone.current_occupancy
            d_cap = d_zone.capacity_limit
            d_delta = int(downstream_share * profile['downstream_spillover_factor'] * mult)

            d_sim_crowd = max(0, d_curr + d_delta)
            d_sim_occ = round((d_sim_crowd / d_cap) * 100, 1) if d_cap > 0 else 0
            d_sim_risk = self.get_risk_level(d_sim_occ)

            downstream_results.append({
                'id': d_zone.id,
                'name': d_zone.name,
                'code': d_zone.code,
                'capacity': d_cap,
                'current_crowd': d_curr,
                'simulated_crowd': d_sim_crowd,
                'crowd_change': d_delta,
                'current_occ_pct': d_zone.occupancy_percentage,
                'simulated_occ_pct': d_sim_occ,
                'current_risk': d_zone.risk_level,
                'simulated_risk': d_sim_risk,
                'effect_level': 'DOWNSTREAM'
            })

        # Compile Complete Simulation Results per zone
        simulated_zones_map = {}
        for z in all_zones:
            if z.id == primary_zone.id:
                sim_c = simulated_primary_crowd
                sim_o = simulated_primary_occ
                sim_r = simulated_primary_risk
                delta_c = delta_primary
                effect = 'PRIMARY_DIRECT'
            else:
                s_match = next((item for item in secondary_results if item['id'] == z.id), None)
                d_match = next((item for item in downstream_results if item['id'] == z.id), None)
                if s_match:
                    sim_c = s_match['simulated_crowd']
                    sim_o = s_match['simulated_occ_pct']
                    sim_r = s_match['simulated_risk']
                    delta_c = s_match['crowd_change']
                    effect = 'SECONDARY'
                elif d_match:
                    sim_c = d_match['simulated_crowd']
                    sim_o = d_match['simulated_occ_pct']
                    sim_r = d_match['simulated_risk']
                    delta_c = d_match['crowd_change']
                    effect = 'DOWNSTREAM'
                else:
                    sim_c = z.current_occupancy
                    sim_o = z.occupancy_percentage
                    sim_r = z.risk_level
                    delta_c = 0
                    effect = 'UNAFFECTED'

            simulated_zones_map[str(z.id)] = {
                'id': z.id,
                'name': z.name,
                'code': z.code,
                'capacity': z.capacity_limit,
                'current_crowd': z.current_occupancy,
                'simulated_crowd': sim_c,
                'crowd_change': delta_c,
                'current_occ_pct': z.occupancy_percentage,
                'simulated_occ_pct': sim_o,
                'current_risk': z.risk_level,
                'simulated_risk': sim_r,
                'effect_level': effect,
                'emergency_route_available': z.emergency_route_available
            }

        # 4. Ripple Effect Structure
        ripple_effect = {
            'primary_affected': {
                'id': primary_zone.id,
                'name': primary_zone.name,
                'code': primary_zone.code,
                'current_crowd': p_curr,
                'simulated_crowd': simulated_primary_crowd,
                'crowd_change': delta_primary,
                'current_occ_pct': primary_zone.occupancy_percentage,
                'simulated_occ_pct': simulated_primary_occ,
                'current_risk': primary_zone.risk_level,
                'simulated_risk': simulated_primary_risk,
                'impact_summary': f"Direct simulation impact on {primary_zone.name}: {delta_primary:+d} crowd count change."
            },
            'secondary_effects': secondary_results,
            'downstream_effects': downstream_results
        }

        # 5. Affected Zones Summary
        affected_zones_list = [
            {
                'id': primary_zone.id,
                'name': primary_zone.name,
                'effect_type': 'DIRECT',
                'occupancy_change': f"{primary_zone.occupancy_percentage}% → {simulated_primary_occ}%",
                'risk_change': f"{primary_zone.risk_level.upper()} → {simulated_primary_risk.upper()}"
            }
        ]
        for s in secondary_results:
            affected_zones_list.append({
                'id': s['id'],
                'name': s['name'],
                'effect_type': 'SECONDARY_RIPPLE',
                'occupancy_change': f"{s['current_occ_pct']}% → {s['simulated_occ_pct']}%",
                'risk_change': f"{s['current_risk'].upper()} → {s['simulated_risk'].upper()}"
            })
        for d in downstream_results:
            affected_zones_list.append({
                'id': d['id'],
                'name': d['name'],
                'effect_type': 'DOWNSTREAM_RIPPLE',
                'occupancy_change': f"{d['current_occ_pct']}% → {d['simulated_occ_pct']}%",
                'risk_change': f"{d['current_risk'].upper()} → {d['simulated_risk'].upper()}"
            })

        # 6. Generate Simulation-Based Recommendation
        high_critical_count = sum(1 for z in simulated_zones_map.values() if z['simulated_risk'] in ['high', 'critical'])

        if scenario_type == 'entry_restriction':
            rec = f"Restricting entry into {primary_zone.name} reduces primary zone occupancy from {primary_zone.occupancy_percentage}% to {simulated_primary_occ}%. "
            if secondary_results:
                top_sec = max(secondary_results, key=lambda x: x['simulated_occ_pct'])
                rec += f"However, diverted crowd shifts to {top_sec['name']} (reaching {top_sec['simulated_occ_pct']}% occupancy). Deploy security personnel to {top_sec['name']} to manage diverted inflow."
            else:
                rec += "Ensure auxiliary exit paths remain clear for steady dispersion."
        elif scenario_type == 'visitor_diversion':
            rec = f"Visitor diversion strategy successfully lowers primary density in {primary_zone.name}. Maintain active public announcements to balance crowd across connected corridors."
        elif scenario_type == 'route_blockage':
            rec = f"Route blockage in {primary_zone.name} causes heavy stagnation risk ({simulated_primary_occ}% occupancy). Immediately open alternative emergency routes in connected sections."
        elif scenario_type == 'sudden_surge':
            rec = f"Sudden surge in {primary_zone.name} increases crowd load significantly ({simulated_primary_occ}% occupancy). Enforce staggered entry and initiate holding area protocols."
        else:
            rec = f"Emergency incident simulation indicates rapid dispersion out of {primary_zone.name}. Ensure emergency response units are positioned at connected section boundaries."

        assumptions = [
            "Simulation estimates potential crowd redistribution based on configured zone capacities and topology assumptions.",
            "Results represent hypothetical decision-support scenarios and are NOT guaranteed future crowd predictions.",
            f"Assumed simulation duration: {duration_minutes} minutes with {intensity.upper()} scenario intensity."
        ]

        # 7. Persist Simulation Run to Database
        sim_run = SimulationRun.objects.create(
            scenario_name=profile['name'],
            scenario_type=scenario_type,
            primary_zone=primary_zone,
            duration_minutes=duration_minutes,
            intensity=intensity,
            input_state_json=json.dumps(initial_state),
            simulated_results_json=json.dumps(simulated_zones_map),
            affected_zones_json=json.dumps(affected_zones_list),
            ripple_effect_json=json.dumps(ripple_effect),
            recommendation=rec,
            created_by=user if (user and getattr(user, 'is_authenticated', False)) else None
        )

        return {
            'simulation_run_id': sim_run.id,
            'scenario_name': profile['name'],
            'scenario_type': scenario_type,
            'primary_zone_id': primary_zone.id,
            'primary_zone_name': primary_zone.name,
            'duration_minutes': duration_minutes,
            'intensity': intensity,
            'initial_state': initial_state,
            'simulated_zones': simulated_zones_map,
            'affected_zones': affected_zones_list,
            'ripple_effect': ripple_effect,
            'recommendation': rec,
            'high_risk_zones_count': high_critical_count,
            'assumptions': assumptions,
            'provenance': {
                'result_label': 'SIMULATED CHANGE',
                'recommendation_label': 'SIMULATION-BASED RECOMMENDATION',
                'is_guaranteed_fact': False
            }
        }

    def compare_actions(self, primary_zone_id, duration_minutes=15, user=None):
        """
        Runs multiple action scenarios (Action 1: Restrict Entry, Action 2: Redirect Visitors, Action 3: Keep Current Flow)
        and compares maximum predicted occupancy, high-risk zone counts, and returns the lowest-risk simulation option.
        """
        actions = [
            {'action_id': 'action_restrict', 'name': 'Action 1: Restrict Entry into Primary Zone', 'scenario_type': 'entry_restriction', 'intensity': 'medium'},
            {'action_id': 'action_divert', 'name': 'Action 2: Temporary Visitor Diversion', 'scenario_type': 'visitor_diversion', 'intensity': 'high'},
            {'action_id': 'action_maintain', 'name': 'Action 3: Maintain Current Flow (No Action)', 'scenario_type': 'sudden_surge', 'intensity': 'low'}
        ]

        comparison_results = []
        for act in actions:
            res = self.run_simulation(
                primary_zone_id=primary_zone_id,
                scenario_type=act['scenario_type'],
                duration_minutes=duration_minutes,
                intensity=act['intensity'],
                user=user
            )

            # Compute key metrics for comparison
            primary_sim_occ = res['ripple_effect']['primary_affected']['simulated_occ_pct']
            max_occ = max([z['simulated_occ_pct'] for z in res['simulated_zones'].values()])
            high_risk_count = res['high_risk_zones_count']
            
            # Risk score rating (lower is safer)
            safety_score = round(100.0 - (max_occ * 0.6 + high_risk_count * 15.0), 1)
            safety_score = max(0.0, min(100.0, safety_score))

            comparison_results.append({
                'action_id': act['action_id'],
                'action_name': act['name'],
                'scenario_type': act['scenario_type'],
                'primary_simulated_occupancy_pct': primary_sim_occ,
                'max_zone_occupancy_pct': max_occ,
                'high_risk_zones_count': high_risk_count,
                'safety_score': safety_score,
                'recommendation': res['recommendation'],
                'simulated_zones': res['simulated_zones']
            })

        # Determine lowest-risk option
        best_option = max(comparison_results, key=lambda x: x['safety_score'])

        return {
            'primary_zone_id': primary_zone_id,
            'duration_minutes': duration_minutes,
            'action_comparisons': comparison_results,
            'simulated_lowest_risk_option': {
                'action_id': best_option['action_id'],
                'action_name': best_option['action_name'],
                'safety_score': best_option['safety_score'],
                'max_occupancy_pct': best_option['max_zone_occupancy_pct'],
                'summary': f"Simulation indicates that '{best_option['action_name']}' yields the lowest overall risk load across connected operational zones with a safety score of {best_option['safety_score']}/100."
            },
            'disclaimer': "This is a simulation-based recommendation for decision-support purposes. Not a guaranteed outcome."
        }

# Global singleton engine instance
simulation_engine = WhatIfSimulationEngine()

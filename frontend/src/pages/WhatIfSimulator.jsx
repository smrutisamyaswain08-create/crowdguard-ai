import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import CrowdDigitalTwin3D from '../components/CrowdDigitalTwin3D';
import { 
  Play, RefreshCw, Layers, ShieldAlert, Activity, CheckCircle, 
  AlertTriangle, ArrowRight, Zap, Info, Sliders, Cpu, GitBranch, Award, Compass, HelpCircle
} from 'lucide-react';

const WhatIfSimulator = () => {
  const { apiFetch, user } = useAuth();
  
  const [zones, setZones] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('Bada Danda');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [scenarioType, setScenarioType] = useState('entry_restriction');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [intensity, setIntensity] = useState('medium');
  
  const [loadingSim, setLoadingSim] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [error, setError] = useState(null);
  
  const [simResult, setSimResult] = useState(null);
  const [compareResult, setCompareResult] = useState(null);

  // Load active zones from backend API
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await apiFetch('/analytics/zones/');
        if (res.ok) {
          const data = await res.json();
          setZones(data);
          if (data.length > 0) {
            setSelectedZoneId(data[0].id.toString());
          }
        }
      } catch (err) {
        console.error("Error fetching operational zones:", err);
      }
    };
    fetchZones();
  }, []);

  // Run What-If Simulation via Real Backend REST API
  const handleRunSimulation = async () => {
    if (!selectedZoneId) return;
    setLoadingSim(true);
    setError(null);

    try {
      const res = await apiFetch('/analytics/simulation/run/', {
        method: 'POST',
        body: JSON.stringify({
          primary_zone_id: selectedZoneId,
          scenario_type: scenarioType,
          duration_minutes: durationMinutes,
          intensity: intensity
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to execute What-If simulation engine.');
      }

      const data = await res.json();
      setSimResult(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to execute simulation. Please try again.');
    } finally {
      setLoadingSim(false);
    }
  };

  // Compare Actions via Real Backend REST API
  const handleCompareActions = async () => {
    if (!selectedZoneId) return;
    setLoadingCompare(true);
    setError(null);

    try {
      const res = await apiFetch('/analytics/simulation/compare/', {
        method: 'POST',
        body: JSON.stringify({
          primary_zone_id: selectedZoneId,
          duration_minutes: durationMinutes
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to compare actions.');
      }

      const data = await res.json();
      setCompareResult(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Action comparison failed. Please try again.');
    } finally {
      setLoadingCompare(false);
    }
  };

  const getRiskBadgeClass = (risk) => {
    switch (String(risk).toLowerCase()) {
      case 'low': return 'risk-low';
      case 'medium':
      case 'moderate': return 'risk-medium';
      case 'high': return 'risk-high';
      case 'critical': return 'risk-critical';
      default: return 'risk-low';
    }
  };

  const selectedZoneObj = zones.find(z => z.id.toString() === selectedZoneId.toString());

  return (
    <div className="whatif-simulator-page" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      {/* Top Banner - Persistent PROTOTYPE MODE Disclaimer */}
      <div className="glass-panel" style={{
        padding: '14px 20px',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.8) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)', fontWeight: 800, fontSize: '0.8rem', border: '1px solid rgba(6, 182, 212, 0.3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="pulsing-dot" /> PROTOTYPE MODE
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Manual Image Input • Prototype Operational Zones • What-If Safety Simulation
          </span>
        </div>

        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', italic: 'true' }}>
          "Prototype zones are configurable operational monitoring areas. Real deployment boundaries will follow official authority plans."
        </div>
      </div>

      {/* Header Info */}
      <div className="page-header-box" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Cpu size={24} style={{ color: 'var(--accent-cyan)' }} />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--accent-cyan) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
            AI Crowd Digital Twin & What-If Safety Simulator
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
          Interactive decision-support simulator. Model hypothetical crowd interventions, predict multi-tier ripple effects across connected operational sections, and compare mitigation options.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="glass-panel" style={{ padding: '14px 20px', borderColor: 'rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)', color: 'var(--risk-critical)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Control Panel Grid (Location, Primary Zone, Scenario, Duration, Intensity) */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
          <Sliders size={18} style={{ color: 'var(--accent-purple)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            What-If Scenario Configuration Controls
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
          {/* Location Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Monitoring Location:
            </label>
            <select
              className="form-select"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 14px', borderRadius: '10px', fontWeight: 600 }}
            >
              <option value="Bada Danda">Bada Danda (Grand Road Corridor)</option>
              <option value="Puri Sea Beach">Puri Sea Beach & Promenade</option>
              <option value="Konark">Konark Temple Sanctuary</option>
            </select>
          </div>

          {/* Primary Zone Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Primary Monitoring Zone:
            </label>
            <select
              className="form-select"
              value={selectedZoneId}
              onChange={(e) => setSelectedZoneId(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 14px', borderRadius: '10px', fontWeight: 600 }}
            >
              {zones.map(z => (
                <option key={z.id} value={z.id}>
                  {z.name} (Cap: {z.capacity_limit})
                </option>
              ))}
            </select>
          </div>

          {/* Scenario Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              What-If Scenario:
            </label>
            <select
              className="form-select"
              value={scenarioType}
              onChange={(e) => setScenarioType(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 14px', borderRadius: '10px', fontWeight: 600 }}
            >
              <option value="entry_restriction">1. Gate / Entry Restriction</option>
              <option value="sudden_surge">2. Sudden Crowd Increase</option>
              <option value="route_blockage">3. Route Blockage</option>
              <option value="emergency_incident">4. Emergency Incident</option>
              <option value="visitor_diversion">5. Temporary Visitor Diversion</option>
            </select>
          </div>

          {/* Duration Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Simulation Duration:
            </label>
            <select
              className="form-select"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 14px', borderRadius: '10px', fontWeight: 600 }}
            >
              <option value="15">15 Minutes</option>
              <option value="30">30 Minutes</option>
              <option value="45">45 Minutes</option>
              <option value="60">60 Minutes</option>
            </select>
          </div>

          {/* Intensity Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Scenario Intensity:
            </label>
            <select
              className="form-select"
              value={intensity}
              onChange={(e) => setIntensity(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 14px', borderRadius: '10px', fontWeight: 600 }}
            >
              <option value="low">Low Intensity</option>
              <option value="medium">Medium Intensity (Standard)</option>
              <option value="high">High Surge Intensity</option>
              <option value="critical">Critical Stress Test</option>
            </select>
          </div>
        </div>

        {/* Action Trigger Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={async () => {
              const zoneA = zones.find(z => z.code === 'ZONE-BADA-A') || zones[0];
              if (!zoneA) return;
              setSelectedZoneId(zoneA.id.toString());
              setScenarioType('sudden_surge');
              setIntensity('high');
              setDurationMinutes(30);

              setLoadingSim(true);
              setError(null);
              try {
                const res = await apiFetch('/analytics/simulation/run/', {
                  method: 'POST',
                  body: JSON.stringify({
                    primary_zone_id: zoneA.id,
                    scenario_type: 'sudden_surge',
                    duration_minutes: 30,
                    intensity: 'high'
                  })
                });
                if (res.ok) {
                  const data = await res.json();
                  setSimResult(data);
                }
              } catch (err) {
                console.error(err);
              } finally {
                setLoadingSim(false);
              }
            }}
            disabled={loadingSim || zones.length === 0}
            className="btn-secondary"
            style={{ padding: '12px 18px', fontSize: '0.88rem', fontWeight: 800, border: '1px solid var(--accent-purple)', color: 'var(--accent-purple)', gap: '6px' }}
          >
            <Zap size={16} />
            <span>⚡ TEST: ZONE A FULL SCENARIO</span>
          </button>

          <button
            onClick={handleCompareActions}
            disabled={loadingCompare || !selectedZoneId}
            className="btn-secondary"
            style={{ padding: '12px 22px', fontSize: '0.92rem', fontWeight: 700, gap: '8px' }}
          >
            {loadingCompare ? <RefreshCw size={16} className="spin-animation" /> : <GitBranch size={16} />}
            <span>COMPARE MITIGATION ACTIONS</span>
          </button>

          <button
            onClick={handleRunSimulation}
            disabled={loadingSim || !selectedZoneId}
            className="btn-primary"
            style={{ padding: '12px 28px', fontSize: '0.95rem', fontWeight: 800, gap: '10px', background: 'linear-gradient(135deg, var(--accent-cyan) 0%, #0284c7 100%)' }}
          >
            {loadingSim ? <RefreshCw size={18} className="spin-animation" /> : <Play size={18} />}
            <span>RUN WHAT-IF SIMULATION</span>
          </button>
        </div>
      </div>

      {/* Interactive 3D Crowd Digital Twin Canvas */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={20} style={{ color: 'var(--accent-cyan)' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Interactive 3D Crowd Digital Twin Viewer
            </h3>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Drag to Rotate • Scroll to Zoom • Anonymous Flow Particles Active
          </span>
        </div>

        <CrowdDigitalTwin3D 
          zonesData={zones} 
          simulationResult={simResult} 
          selectedZoneId={selectedZoneId}
          onSelectZone={(id) => setSelectedZoneId(id.toString())}
        />
      </div>

      {/* Before vs After Simulation Results Panel */}
      {simResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          {/* Top Recommendation Box */}
          <div className="glass-panel" style={{ padding: '24px', borderColor: 'rgba(6, 182, 212, 0.4)', background: 'rgba(6, 182, 212, 0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-cyan)' }}>
              <Award size={22} />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                SIMULATION-BASED RECOMMENDATION
              </h3>
            </div>
            <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.98rem', lineHeight: '1.6' }}>
              {simResult.recommendation}
            </p>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', italic: 'true', borderTop: '1px dashed rgba(6, 182, 212, 0.2)', paddingTop: '8px' }}>
              * Decision-support recommendation based on configured scenario assumptions. Not a guaranteed outcome.
            </div>
          </div>

          {/* Before vs After Comparison Grid */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} style={{ color: 'var(--accent-purple)' }} />
                BEFORE vs AFTER SIMULATION COMPARISON
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                Scenario: <strong>{simResult.scenario_name}</strong> ({simResult.duration_minutes}m)
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px 10px' }}>Zone Name</th>
                    <th style={{ padding: '12px 10px' }}>Capacity</th>
                    <th style={{ padding: '12px 10px' }}>Current Occupancy</th>
                    <th style={{ padding: '12px 10px' }}>Simulated Occupancy</th>
                    <th style={{ padding: '12px 10px' }}>Simulated Change</th>
                    <th style={{ padding: '12px 10px' }}>Risk Shift</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(simResult.simulated_zones).map((sz) => (
                    <tr key={sz.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: sz.id.toString() === selectedZoneId.toString() ? 'rgba(6, 182, 212, 0.08)' : 'transparent' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {sz.name}
                        {sz.effect_level === 'PRIMARY_DIRECT' && <span style={{ marginLeft: '8px', fontSize: '0.7rem', color: 'var(--accent-cyan)', background: 'rgba(6,182,212,0.15)', padding: '2px 6px', borderRadius: '4px' }}>PRIMARY</span>}
                      </td>
                      <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{sz.capacity}</td>
                      <td style={{ padding: '12px 10px' }}>{sz.current_crowd} ({sz.current_occ_pct}%)</td>
                      <td style={{ padding: '12px 10px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                        {sz.simulated_crowd} ({sz.simulated_occ_pct}%)
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 700, color: sz.crowd_change >= 0 ? '#f59e0b' : '#10b981' }}>
                        {sz.crowd_change >= 0 ? `+${sz.crowd_change}` : sz.crowd_change}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span className={`badge-risk ${getRiskBadgeClass(sz.simulated_risk)}`}>
                          {sz.current_risk.toUpperCase()} → {sz.simulated_risk.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dedicated "Where To Go" Redirection & Zone B / C Ripple Visualizer */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', borderColor: 'rgba(6, 182, 212, 0.4)', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(13, 10, 24, 0.9) 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Compass size={22} style={{ color: 'var(--accent-cyan)' }} />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  CROWD REDIRECTION & ZONE B / C RIPPLE FLOW VISUALIZER
                </h3>
              </div>
              <span style={{ fontSize: '0.78rem', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)', padding: '4px 10px', borderRadius: '12px', fontWeight: 700, border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                ⚡ REAL-TIME CROWD FLOW PATHWAY
              </span>
            </div>

            {/* Visual Flow Diagram: Zone A -> Zone B -> Zone C */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '15px', background: 'rgba(255, 255, 255, 0.02)', padding: '20px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
              
              {/* Zone A Card */}
              <div style={{ flex: 1, minWidth: '220px', background: 'rgba(239, 68, 68, 0.12)', border: '2px solid #ef4444', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', marginBottom: '4px' }}>
                  🔴 ZONE A (ENTRY SECTION)
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                  {simResult.ripple_effect.primary_affected.name}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#fca5a5', marginTop: '6px', fontWeight: 700 }}>
                  Simulated Occ: {simResult.ripple_effect.primary_affected.simulated_occ_pct}%
                </div>
                <div style={{ marginTop: '10px', background: 'rgba(239, 68, 68, 0.25)', padding: '6px', borderRadius: '8px', fontSize: '0.8rem', color: '#ffffff', fontWeight: 700 }}>
                  🚫 REDUCE / RESTRICT INFLOW
                </div>
              </div>

              {/* Flow Arrow A -> B */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#f59e0b' }}>
                  DIVERTED FLOW
                </span>
                <ArrowRight size={32} style={{ color: 'var(--accent-cyan)' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Bypass Route
                </span>
              </div>

              {/* Zone B Card */}
              <div style={{ flex: 1, minWidth: '220px', background: 'rgba(245, 158, 11, 0.12)', border: '2px solid #f59e0b', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', marginBottom: '4px' }}>
                  🟡 ZONE B (CENTRAL SECTION)
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>
                  👉 "WHERE TO GO"
                </div>
                <div style={{ fontSize: '0.85rem', color: '#fde047', marginTop: '6px', fontWeight: 700 }}>
                  {simResult.ripple_effect.secondary_effects.length > 0 
                    ? `Diverted Shift: +${simResult.ripple_effect.secondary_effects[0].crowd_change} persons`
                    : "Receives Diverted Crowd"}
                </div>
                <div style={{ marginTop: '10px', background: 'rgba(245, 158, 11, 0.25)', padding: '6px', borderRadius: '8px', fontSize: '0.8rem', color: '#ffffff', fontWeight: 700 }}>
                  👮 DEPLOY OFFICERS TO HOLDING
                </div>
              </div>

              {/* Flow Arrow B -> C */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-purple)' }}>
                  SPILLOVER EGRESS
                </span>
                <ArrowRight size={32} style={{ color: 'var(--accent-purple)' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Exit Path
                </span>
              </div>

              {/* Zone C Card */}
              <div style={{ flex: 1, minWidth: '220px', background: 'rgba(34, 197, 94, 0.12)', border: '2px solid #22c55e', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#22c55e', textTransform: 'uppercase', marginBottom: '4px' }}>
                  🟢 ZONE C (EXIT SECTION)
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                  OUTFLOW CORRIDOR
                </div>
                <div style={{ fontSize: '0.85rem', color: '#86efac', marginTop: '6px', fontWeight: 700 }}>
                  {simResult.ripple_effect.downstream_effects.length > 0 
                    ? `Spillover Shift: +${simResult.ripple_effect.downstream_effects[0].crowd_change} persons`
                    : "Maintains Downstream Egress"}
                </div>
                <div style={{ marginTop: '10px', background: 'rgba(34, 197, 94, 0.25)', padding: '6px', borderRadius: '8px', fontSize: '0.8rem', color: '#ffffff', fontWeight: 700 }}>
                  🚪 KEEP EXIT GATES OPEN
                </div>
              </div>

            </div>
          </div>

          {/* Ripple Effect Breakdown */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <GitBranch size={20} style={{ color: 'var(--accent-cyan)' }} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                MULTI-LEVEL RIPPLE EFFECT BREAKDOWN
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              {/* Primary Affected */}
              <div style={{ background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  🔴 DIRECTLY AFFECTED (PRIMARY)
                </div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {simResult.ripple_effect.primary_affected.name}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Crowd Change: <strong style={{ color: 'var(--text-primary)' }}>{simResult.ripple_effect.primary_affected.crowd_change >= 0 ? `+${simResult.ripple_effect.primary_affected.crowd_change}` : simResult.ripple_effect.primary_affected.crowd_change}</strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {simResult.ripple_effect.primary_affected.impact_summary}
                </div>
              </div>

              {/* Secondary Effect */}
              <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', marginBottom: '8px' }}>
                  🟡 SECONDARY RIPPLE EFFECT (CONNECTED)
                </div>
                {simResult.ripple_effect.secondary_effects.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No direct connected secondary zones configured.</div>
                ) : (
                  simResult.ripple_effect.secondary_effects.map(s => (
                    <div key={s.id} style={{ marginBottom: '8px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{s.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Inflow Shift: <strong style={{ color: '#f59e0b' }}>+{s.crowd_change}</strong> ({s.current_occ_pct}% → {s.simulated_occ_pct}%)
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Downstream Effect */}
              <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-purple)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  🟣 DOWNSTREAM RIPPLE EFFECT (SECONDARY CONNECTED)
                </div>
                {simResult.ripple_effect.downstream_effects.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No secondary downstream spillover detected.</div>
                ) : (
                  simResult.ripple_effect.downstream_effects.map(d => (
                    <div key={d.id} style={{ marginBottom: '8px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{d.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Spillover Shift: <strong style={{ color: 'var(--accent-purple)' }}>+{d.crowd_change}</strong> ({d.current_occ_pct}% → {d.simulated_occ_pct}%)
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compare Mitigation Actions Matrix */}
      {compareResult && (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px', borderColor: 'var(--accent-purple)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-purple)' }}>
            <GitBranch size={22} />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
              MITIGATION ACTION COMPARISON MATRIX
            </h3>
          </div>

          <div style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-purple)', textTransform: 'uppercase', marginBottom: '4px' }}>
              🏆 SIMULATED LOWEST-RISK OPTION
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              {compareResult.simulated_lowest_risk_option.action_name}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {compareResult.simulated_lowest_risk_option.summary}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Action Name</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Max Occupancy %</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>High-Risk Zones</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Safety Score</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Action Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {compareResult.action_comparisons.map((ac) => {
                  const isBest = ac.action_id === compareResult.simulated_lowest_risk_option.action_id;
                  return (
                    <tr key={ac.action_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: isBest ? 'rgba(168, 85, 247, 0.1)' : 'transparent' }}>
                      <td style={{ padding: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {ac.action_name} {isBest && <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: '#a855f7', background: 'rgba(168,85,247,0.2)', padding: '2px 6px', borderRadius: '4px' }}>RECOMMENDED</span>}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700 }}>{ac.max_zone_occupancy_pct}%</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{ac.high_risk_zones_count}</td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: 800, color: isBest ? '#22c55e' : 'var(--text-primary)' }}>{ac.safety_score} / 100</td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{ac.recommendation}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Data Provenance Panel */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(15, 23, 42, 0.6)' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Info size={16} style={{ color: 'var(--accent-cyan)' }} /> SYSTEM DATA PROVENANCE PANEL
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '0.82rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>SOURCE:</span>
            <strong style={{ color: 'var(--text-primary)' }}>Manual Image / Simulated Camera Input</strong>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>MODEL:</span>
            <strong style={{ color: 'var(--text-primary)' }}>YOLOv8 / CSRNet Pipeline</strong>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>MONITORING LOCATION:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{selectedLocation}</strong>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>SELECTED ZONE:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{selectedZoneObj ? selectedZoneObj.name : 'Zone B - Central Section'}</strong>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>RESULT TYPE:</span>
            <strong style={{ color: 'var(--accent-cyan)' }}>AI Estimated</strong>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>WHAT-IF STATUS:</span>
            <strong style={{ color: 'var(--accent-purple)' }}>{simResult ? "SIMULATED CHANGE" : "Simulation Ready"}</strong>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>LIVE CCTV STREAM:</span>
            <strong style={{ color: 'var(--text-secondary)' }}>Not Connected (Simulated Input)</strong>
          </div>
        </div>
      </div>

    </div>
  );
};

export default WhatIfSimulator;

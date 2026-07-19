// Corpus manifest — real, public, directly-downloadable industrial documents.
// Every entry becomes a PDF/HTML fetched + text-extracted + ingested through the
// exact same pipeline the product uses at runtime. Provenance (sourceUrl) is
// stored on every ingested document.

// -- Genuinely industrial primary sources (heavy, plant-relevant PDFs) --------
export const INDUSTRIAL_PDFS = [
  // OISD (Oil Industry Safety Directorate, Govt of India) — real standards
  "https://www.oisd.gov.in/public/assets/upload/Content/1716830377_86589bd96e3434e7e420.pdf",
  // U.S. Chemical Safety Board — real refinery/plant incident investigations
  "https://www.csb.gov/assets/1/20/chevron_final_investigation_report_2015-01-28.pdf",
  "https://www.csb.gov/assets/1/6/csb_incident_reports_volume_one_2025-01-14.pdf",
  "https://www.csb.gov/assets/1/6/csb_incident_reports_volume_one_2025-01-14_rev_1.pdf",
  "https://www.csb.gov/assets/1/6/final_report_-_20241.pdf",
];

// -- Engineering & operations reference (Wikipedia PDF export) ----------------
// Real technical reference knowledge that powers the Expert Copilot. Grouped by
// the plant knowledge domains the problem statement calls out.
const WIKI_TITLES = [
  // Rotating equipment
  "Centrifugal_pump", "Pump", "Positive_displacement_pump", "Reciprocating_pump",
  "Mechanical_seal", "Gland_(engineering)", "Rolling-element_bearing", "Journal_bearing",
  "Shaft_alignment", "Vibration", "Rotordynamics", "Balancing_machine", "Coupling",
  "Gas_compressor", "Centrifugal_compressor", "Reciprocating_compressor", "Axial_compressor",
  "Gas_turbine", "Steam_turbine", "Turbine", "Electric_motor", "Induction_motor", "Cavitation",
  "Net_positive_suction_head", "Impeller", "Lubrication", "Grease", "Tribology", "Fan_(machine)",
  "Blower", "Screw_pump", "Gear_pump", "Diaphragm_pump", "Slurry_pump",
  // Static equipment / process
  "Heat_exchanger", "Shell_and_tube_heat_exchanger", "Plate_heat_exchanger", "Air_cooler",
  "Fired_heater", "Boiler", "Pressure_vessel", "Distillation", "Fractionating_column",
  "Continuous_distillation", "Reboiler", "Condenser_(heat_transfer)", "Reflux",
  "Cooling_tower", "Storage_tank", "Separator_(oil_production)", "Cyclonic_separation",
  "Fluid_catalytic_cracking", "Catalytic_reforming", "Hydrocracking", "Hydrodesulfurization",
  "Oil_refinery", "Petroleum_refining_processes", "Crude_oil", "Amine_gas_treating",
  "Claus_process", "Sulfur_recovery", "Vacuum_distillation", "Alkylation", "Isomerization",
  "Steam_reforming", "Ammonia_production", "Haber_process", "Urea", "Cement_kiln",
  // Piping / valves / instrumentation
  "Piping_and_instrumentation_diagram", "Piping", "Pipe_(fluid_conveyance)", "Piping_isometric",
  "Process_flow_diagram", "Valve", "Control_valve", "Ball_valve", "Gate_valve", "Globe_valve",
  "Check_valve", "Butterfly_valve", "Relief_valve", "Safety_valve", "Pressure_relief_valve",
  "Rupture_disc", "Flange", "Gasket", "Actuator", "Instrumentation", "Process_control",
  "PID_controller", "Programmable_logic_controller", "Distributed_control_system", "SCADA",
  "Flow_measurement", "Orifice_plate", "Venturi_effect", "Rotameter", "Coriolis",
  "Pressure_measurement", "Pressure_sensor", "Thermocouple", "Resistance_thermometer",
  "Level_sensor", "Transmitter", "Field_device", "Fieldbus", "HART_Protocol", "Modbus",
  // Materials / integrity / inspection
  "Corrosion", "Corrosion_under_insulation", "Stress_corrosion_cracking", "Pitting_corrosion",
  "Galvanic_corrosion", "Erosion_corrosion", "Cathodic_protection", "Passivation",
  "Nondestructive_testing", "Ultrasonic_testing", "Radiographic_testing", "Magnetic_particle_inspection",
  "Dye_penetrant_inspection", "Eddy-current_testing", "Visual_inspection", "Hardness",
  "Fatigue_(material)", "Creep_(deformation)", "Fracture_mechanics", "Welding", "Arc_welding",
  "Gas_tungsten_arc_welding", "Weld_defect", "Heat_treating", "Stainless_steel", "Carbon_steel",
  "Alloy_steel", "Duplex_stainless_steel", "Inconel", "Metallurgy", "Material_selection",
  "Wall_thickness", "Remaining_useful_life", "Asset_integrity",
  // Reliability / maintenance
  "Reliability_engineering", "Reliability-centered_maintenance", "Preventive_maintenance",
  "Predictive_maintenance", "Condition_monitoring", "Failure_mode_and_effects_analysis",
  "Root_cause_analysis", "Five_whys", "Fault_tree_analysis", "Bathtub_curve", "Weibull_distribution",
  "Mean_time_between_failures", "Availability", "Total_productive_maintenance", "Computerized_maintenance_management_system",
  "Overall_equipment_effectiveness", "Failure_rate", "Ishikawa_diagram", "Pareto_analysis",
  "Spare_part", "Turnaround_(maintenance)", "Lockout-tagout", "Permit_to_work",
  // Process safety / HSE / regulatory
  "Process_safety", "Process_safety_management", "Hazard_and_operability_study", "HAZID",
  "Layer_of_protection_analysis", "Safety_integrity_level", "Safety_instrumented_system",
  "Functional_safety", "IEC_61511", "IEC_61508", "Bow-tie_analysis", "Risk_assessment",
  "As_low_as_reasonably_practicable", "Fire_protection", "Fire_triangle", "Flammability_limit",
  "Flash_point", "Autoignition_temperature", "Explosion", "Vapor_cloud_explosion", "BLEVE",
  "Boiling_liquid_expanding_vapor_explosion", "Dust_explosion", "Deluge_system", "Fire_sprinkler_system",
  "Gas_detector", "Flame_detector", "Personal_protective_equipment", "Confined_space",
  "Material_safety_data_sheet", "Occupational_safety_and_health", "Bhopal_disaster",
  "Piper_Alpha", "Flixborough_disaster", "Texas_City_refinery_explosion", "Deepwater_Horizon",
  "Emergency_shutdown", "Blowdown_(petroleum)", "Flare", "Relief_system",
  // Standards / management / units
  "API_(American_Petroleum_Institute)", "ASME", "ASME_Boiler_and_Pressure_Vessel_Code",
  "ISO_9000", "ISO_14001", "ISO_45001", "Quality_management_system", "Six_Sigma",
  "Statistical_process_control", "Management_of_change", "Knowledge_management", "Ontology_(information_science)",
  "Knowledge_graph", "Digital_twin", "Industry_4.0", "Industrial_internet_of_things",
  "Factories_Act,_1948", "Petroleum_and_Explosives_Safety_Organisation",
  // Thermo / fluids fundamentals
  "Thermodynamics", "Heat_transfer", "Fluid_dynamics", "Bernoulli's_principle", "Reynolds_number",
  "Viscosity", "Pressure", "Enthalpy", "Latent_heat", "Vapor_pressure", "Phase_diagram",
  "Chemical_reactor", "Mass_transfer", "Unit_operation", "Process_engineering",
];

export const WIKI_PDFS = [...new Set(WIKI_TITLES)].map(
  (t) => `https://en.wikipedia.org/api/rest_v1/page/pdf/${encodeURIComponent(t)}`
);

export const ALL_URLS = [...INDUSTRIAL_PDFS, ...WIKI_PDFS];

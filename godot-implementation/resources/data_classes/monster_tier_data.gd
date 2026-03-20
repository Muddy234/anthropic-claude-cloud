class_name MonsterTierData
extends Resource

@export_group("Identity")
@export var tier: Constants.MonsterTier = Constants.MonsterTier.TIER_3
@export var tier_name: String = ""
@export var indicator: String = ""
@export var color: Color = Color.WHITE
@export var description: String = ""

@export_group("Perception")
@export var sight_range: float = 3.0
@export var sight_cone_angle: float = 50.0
@export var can_see_in_dark: bool = false
@export var peripheral_range: float = 0.0
@export var hearing_range: float = 6.0
@export var hearing_multiplier: float = 0.8
@export var deaf_during_combat: bool = true
@export var reaction_delay: float = 0.6        # Seconds (JS uses ms, divided by 1000)
@export var alertness_falloff: float = 2.0
@export var memory_duration: float = 0.0        # Seconds
@export var memory_accuracy: float = 0.0

@export_group("Movement")
@export var base_speed: float = 2.5
@export var chase_speed: float = 3.0
@export var flee_speed: float = 4.0
@export var combat_speed: float = 2.0
@export var strafe_mult: float = 0.6
@export var retreat_mult: float = 0.8
@export var injured_mult: float = 1.2
@export var wander_pattern: Constants.WanderPattern = Constants.WanderPattern.RANDOM
@export var wander_radius: float = 4.0
@export var pause_chance: float = 0.3
@export var pause_duration_min: float = 1.0     # Seconds (JS uses ms, divided by 1000)
@export var pause_duration_max: float = 3.0
@export var turn_chance: float = 0.5

@export_group("Combat")
@export var windup_duration: float = 0.5        # Seconds (JS uses ms, divided by 1000)
@export var attack_duration: float = 0.7
@export var recovery_duration: float = 0.4
@export var attack_cooldown: float = 2.5
@export var tracks_during_windup: bool = false
@export var tracking_cutoff: float = 0.0
@export var can_interrupt_attack: bool = true
@export var attack_arc: float = -1.0            # -1 = single target (JS null)
@export var charge_distance: float = 0.0
@export var knockback_on_hit: float = 0.0
@export var telegraph_color: Color = Color.WHITE
@export var telegraph_intensity: float = 0.3
@export var max_attackers_contribution: float = 0.5
@export var circling_speed: float = 1.5
@export var maintains_formation: bool = false

@export_group("Defense")
@export var flee_threshold: float = 0.3
@export var flee_to_ally: bool = true
@export var flee_distance: float = 6.0
@export var evasion_chance: float = 0.0
@export var evasion_cooldown: float = 0.0
@export var can_dodge_aoe: bool = false
@export var dodge_distance: float = 0.0
@export var base_damage_reduction: float = 0.0
@export var resistances: Dictionary = {}        # Element string -> float
@export var status_resistance: Dictionary = {}  # Status string -> float

@export_group("Social")
@export var can_lead: bool = false
@export var command_range: float = 0.0
@export var commandable_by: Array[Constants.MonsterTier] = []
@export var follow_distance: float = 3.0
@export var follow_formation: Constants.FollowFormation = Constants.FollowFormation.CLUSTER
@export var pack_courage: bool = true
@export var pack_courage_threshold: int = 4
@export var pack_courage_bonus: float = 0.1
@export var is_sacrificial: bool = true
@export var can_sacrifice_minions: bool = false
@export var sacrifice_threshold: float = 0.0
@export var sacrifice_heal: float = 0.0
@export var sacrifice_damage_buff: float = 0.0
@export var shout_range: float = 5.0
@export var shout_delay: float = 1.5
@export var shout_interruptable: bool = true
@export var alert_on_damage: bool = true
@export var alert_on_death: bool = true
@export var base_morale: int = 40
@export var morale_per_ally_death: int = 15
@export var morale_panic_threshold: int = 20
@export var morale_recovery_rate: int = 5

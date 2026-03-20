class_name AbilityData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""
@export var description: String = ""
@export var category: Constants.AttackCategory = Constants.AttackCategory.MELEE

@export_group("Damage")
@export var damage: float = 0.0
@export var range_tiles: float = 1.0          # 'range' is a keyword
@export var hit_count: int = 1
@export var hit_delay: float = 0.0            # Seconds between multi-hits

@export_group("AoE")
@export var aoe: AoeShapeData = null

@export_group("Timing")
@export var telegraph_time: float = 0.6       # Seconds (JS ms / 1000)
@export var cooldown: float = 1.6             # Seconds
@export var recovery_time: float = 0.6        # Seconds

@export_group("Movement")
@export var charge_distance: float = 0.0      # Tiles lunged forward
@export var charge_speed: float = 0.0

@export_group("Effects")
@export var effect: String = ""               # e.g., 'knockback', 'stun', 'burn'
@export var knockback_force: float = 0.0
@export var stun_duration: float = 0.0
@export var dot_damage: float = 0.0
@export var dot_duration: float = 0.0
@export var slow_amount: float = 0.0
@export var slow_duration: float = 0.0
@export var projectile_speed: float = 0.0
@export var projectile_count: int = 0

@export_group("Usage Restrictions")
@export var for_boss: bool = false
@export var for_enemy: bool = false
@export var allowed_enemies: PackedStringArray = []  # Named exceptions

@export_group("Summon")
@export var summon_type: String = ""
@export var summon_count: int = 0
@export var summon_duration: float = 0.0

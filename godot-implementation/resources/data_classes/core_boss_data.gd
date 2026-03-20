class_name CoreBossData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""
@export var title: String = ""
@export var description: String = ""

@export_group("Base Stats")
@export var health: int = 5000
@export var damage: int = 40
@export var defense: int = 30
@export var speed: float = 1.5
@export var attack_speed: float = 1.0

@export_group("Visual")
@export var sprite: String = ""
@export var size: int = 4
@export var color: Color = Color.WHITE
@export var glow_color: Color = Color.WHITE
@export var glow_intensity: float = 0.8

@export_group("Phases")
@export var phases: Array[BossPhaseData] = []

class_name ItemData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""
@export var description: String = ""
@export var item_type: Constants.ItemType = Constants.ItemType.CONSUMABLE

@export_group("Classification")
@export var subtype: Constants.ConsumableSubtype = Constants.ConsumableSubtype.HEALING
@export var rarity: Constants.Rarity = Constants.Rarity.COMMON

@export_group("Stacking")
@export var stackable: bool = true
@export var max_stack: int = 10

@export_group("Effect")
@export var effect_type: Constants.EffectType = Constants.EffectType.HEAL
@export var effect_value: float = 0.0          # Flat heal, mana restore, etc.
@export var effect_stat: String = ""           # For buffs: 'str', 'agi', etc.
@export var effect_duration: float = 0.0       # Seconds
@export var effect_is_percent: bool = false     # true for healPercent

@export_group("Economy")
@export var gold_value: int = 0

@export_group("Quest Item Properties")
@export var quest_id: String = ""              # Which quest this belongs to
@export var unique: bool = false               # Can only hold one

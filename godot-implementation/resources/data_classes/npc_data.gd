class_name NpcData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""
@export var title: String = ""
@export var description: String = ""
@export var color: Color = Color.WHITE

@export_group("Location & Role")
@export var building: String = ""
@export var role: Constants.NpcRole = Constants.NpcRole.SHOPKEEPER

@export_group("Dialogue")
@export var dialogue_tree: String = ""
@export var initial_dialogue: String = ""
@export var barks: PackedStringArray = []

@export_group("Services")
@export var services: PackedStringArray = []    # e.g. ["bank", "deposit", "withdraw"]

@export_group("Shop")
@export var shop_inventory: PackedStringArray = []  # Item IDs for sale
@export var buy_multiplier: float = 1.0
@export var sell_multiplier: float = 0.5

@export_group("Narrative")
@export var narrative: NpcNarrativeData = null

@export_group("Aliases")
@export var alias_of: String = ""              # For backward compat references

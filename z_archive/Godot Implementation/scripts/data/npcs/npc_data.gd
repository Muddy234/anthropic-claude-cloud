class_name NPCData
extends Resource

## Data resource for NPC definitions

@export var id: String = ""
@export var display_name: String = ""
@export var title: String = ""  # e.g., "Village Elder", "Blacksmith"
@export var description: String = ""

@export var portrait: Texture2D
@export var sprite: Texture2D

# NPC type
@export_enum("merchant", "quest_giver", "service", "story", "ambient") var npc_type: String = "ambient"

# Merchant settings
@export var is_merchant: bool = false
@export var shop_inventory: Array[String] = []  # Item IDs
@export var buy_multiplier: float = 0.5  # Sells to player at base price, buys at this multiplier

# Quest settings
@export var has_quest: bool = false
@export var quest_ids: Array[String] = []

# Service settings (bank, shrine, etc.)
@export var service_type: String = ""  # "bank", "heal", "save", "upgrade"

# Dialogue
@export var greeting_dialogue: String = ""
@export var dialogue_tree_id: String = ""  # Reference to dialogue tree resource

# Availability
@export var available_from_floor: int = 0  # 0 = always available
@export var world_state_requirements: Dictionary = {}  # world_state -> available

# Location
@export var default_building: String = ""  # Building ID where NPC is found

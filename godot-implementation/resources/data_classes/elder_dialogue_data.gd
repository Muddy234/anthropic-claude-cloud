class_name ElderDialogueData
extends Resource

@export var id: String = ""
@export var speaker: String = ""
@export var condition: String = ""             # When this dialogue triggers
@export var lines: PackedStringArray = []
@export var choices: Array[Dictionary] = []    # [{text, next_id, condition}]

class_name QuestObjectiveData
extends Resource

@export var type: Constants.QuestObjectiveType = Constants.QuestObjectiveType.REACH_FLOOR
@export var description: String = ""
@export var target_floor: int = -1            # For reach_floor
@export var item_id: String = ""              # For collect
@export var target_count: int = 0             # For collect, kill, defeat_guardian

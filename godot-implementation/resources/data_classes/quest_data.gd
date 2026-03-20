class_name QuestData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""
@export var description: String = ""
@export var quest_type: Constants.QuestType = Constants.QuestType.MAIN

@export_group("Structure")
@export var giver: String = ""                # NPC ID
@export var prerequisite: String = ""         # Quest ID (empty = none)
@export var repeatable: bool = false

@export_group("Objectives")
@export var objectives: Array[QuestObjectiveData] = []

@export_group("Rewards")
@export var rewards: QuestRewardData = null

@export_group("Dialogue")
@export var dialogue_start: String = ""
@export var dialogue_progress: String = ""
@export var dialogue_complete: String = ""

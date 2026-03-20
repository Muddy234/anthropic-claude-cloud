class_name QuestRewardData
extends Resource

@export var gold: int = 0
@export var item_rewards: Dictionary = {}     # {item_id: count}
@export var unlocks: PackedStringArray = []   # Quest IDs or feature IDs unlocked

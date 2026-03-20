class_name BountyObjectiveData
extends Resource

@export var type: Constants.BountyType = Constants.BountyType.KILL
@export var target: String = ""               # Monster type or 'any'
@export var count: int = 0
@export var floor: int = -1                   # -1 = any floor

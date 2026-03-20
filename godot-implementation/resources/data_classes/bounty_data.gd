class_name BountyData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""
@export var description: String = ""

@export_group("Classification")
@export var bounty_type: Constants.BountyType = Constants.BountyType.KILL
@export var tier: Constants.Rarity = Constants.Rarity.COMMON  # Reuse rarity for tier

@export_group("Objective")
@export var objective: BountyObjectiveData = null

@export_group("Reward")
@export var reward_gold: int = 0
@export var reward_items: Dictionary = {}     # {item_id: count}

@export_group("Limits")
@export var expires_after: int = 3            # Failed attempts before expiration

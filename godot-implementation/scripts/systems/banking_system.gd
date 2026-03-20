class_name BankingSystem
extends BaseSystem
## Village bank: persistent gold and item storage that survives death.
## Accessible only in village via Banker NPC.

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

const MAX_BANK_SLOTS: int = 30
const MAX_GOLD: int = 999999
const INTEREST_RATE: float = 0.01  # 1% per run

# ---------------------------------------------------------------------------
# BaseSystem overrides
# ---------------------------------------------------------------------------

func _init() -> void:
	system_name = "banking_system"
	priority = 50


func initialize() -> void:
	pass


func process_system(_delta: float) -> void:
	pass


func cleanup() -> void:
	pass


# ---------------------------------------------------------------------------
# Gold operations
# ---------------------------------------------------------------------------

## Deposit gold from current run into the bank. Returns true on success.
func deposit_gold(amount: int) -> bool:
	if amount <= 0:
		return false
	if GameManager.run_state == null or GameManager.persistent_state == null:
		return false
	if GameManager.run_state.gold < amount:
		return false

	var new_balance: int = GameManager.persistent_state.bank_gold + amount
	if new_balance > MAX_GOLD:
		return false

	GameManager.run_state.gold -= amount
	GameManager.persistent_state.bank_gold = new_balance
	_save()
	return true


## Withdraw gold from the bank into the current run. Returns true on success.
func withdraw_gold(amount: int) -> bool:
	if amount <= 0:
		return false
	if GameManager.run_state == null or GameManager.persistent_state == null:
		return false
	if GameManager.persistent_state.bank_gold < amount:
		return false

	GameManager.persistent_state.bank_gold -= amount
	GameManager.run_state.gold += amount
	_save()
	return true


## Get current bank gold balance.
func get_balance() -> int:
	if GameManager.persistent_state == null:
		return 0
	return GameManager.persistent_state.bank_gold


# ---------------------------------------------------------------------------
# Item operations
# ---------------------------------------------------------------------------

## Deposit an item from run inventory into the bank. Returns true on success.
func deposit_item(inventory_index: int) -> bool:
	if GameManager.run_state == null or GameManager.persistent_state == null:
		return false
	if inventory_index < 0 or inventory_index >= GameManager.run_state.inventory.size():
		return false
	if GameManager.persistent_state.bank_items.size() >= _get_capacity():
		return false

	var item = GameManager.run_state.inventory[inventory_index]
	GameManager.run_state.inventory.remove_at(inventory_index)
	GameManager.persistent_state.bank_items.append(item)
	_save()
	return true


## Withdraw an item from the bank into the run inventory. Returns true on success.
func withdraw_item(bank_slot: int) -> bool:
	if GameManager.run_state == null or GameManager.persistent_state == null:
		return false
	if bank_slot < 0 or bank_slot >= GameManager.persistent_state.bank_items.size():
		return false

	var item = GameManager.persistent_state.bank_items[bank_slot]
	GameManager.persistent_state.bank_items.remove_at(bank_slot)
	GameManager.run_state.inventory.append(item)
	_save()
	return true


## Get bank contents array.
func get_bank_contents() -> Array:
	if GameManager.persistent_state == null:
		return []
	return GameManager.persistent_state.bank_items


## Get number of used bank slots.
func get_used_slots() -> int:
	if GameManager.persistent_state == null:
		return 0
	return GameManager.persistent_state.bank_items.size()


## Get total bank capacity.
func get_capacity() -> int:
	return _get_capacity()


## Check if bank is full.
func is_full() -> bool:
	return get_used_slots() >= _get_capacity()


# ---------------------------------------------------------------------------
# Interest
# ---------------------------------------------------------------------------

## Apply interest on deposits. Called once per run start.
func apply_interest() -> void:
	if GameManager.persistent_state == null:
		return
	var current: int = GameManager.persistent_state.bank_gold
	if current <= 0:
		return
	var interest: int = maxi(1, int(float(current) * INTEREST_RATE))
	GameManager.persistent_state.bank_gold = mini(current + interest, MAX_GOLD)
	_save()


# ---------------------------------------------------------------------------
# Upgrade capacity
# ---------------------------------------------------------------------------

## Upgrade bank capacity (persistent improvement).
func upgrade_capacity(additional_slots: int) -> void:
	if GameManager.persistent_state == null:
		return
	GameManager.persistent_state.bank_capacity += additional_slots
	_save()


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

func _get_capacity() -> int:
	if GameManager.persistent_state != null:
		return GameManager.persistent_state.bank_capacity
	return MAX_BANK_SLOTS


func _save() -> void:
	if GameManager.persistent_state != null:
		SaveManager.save_game(GameManager.persistent_state)

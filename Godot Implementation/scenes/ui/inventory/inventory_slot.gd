class_name InventorySlot
extends PanelContainer

## Single inventory slot that can hold an item

signal slot_clicked(slot: InventorySlot)
signal slot_right_clicked(slot: InventorySlot)
signal item_dropped(from_slot: InventorySlot, to_slot: InventorySlot)

@onready var icon: TextureRect = $MarginContainer/Icon
@onready var quantity_label: Label = $QuantityLabel
@onready var cooldown_overlay: ColorRect = $CooldownOverlay
@onready var selection_border: Panel = $SelectionBorder

var item: ItemData = null
var quantity: int = 0
var slot_index: int = -1
var slot_type: Constants.EquipSlot = Constants.EquipSlot.NONE
var is_equipment_slot: bool = false
var is_selected: bool = false
var is_locked: bool = false

func _ready():
	gui_input.connect(_on_gui_input)
	mouse_entered.connect(_on_mouse_entered)
	mouse_exited.connect(_on_mouse_exited)
	_update_display()

func _on_gui_input(event: InputEvent):
	if is_locked:
		return

	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_LEFT:
			slot_clicked.emit(self)
		elif event.button_index == MOUSE_BUTTON_RIGHT:
			slot_right_clicked.emit(self)

func _on_mouse_entered():
	if item:
		EventBus.item_hovered.emit(item)

func _on_mouse_exited():
	EventBus.item_unhovered.emit()

## Set the item in this slot
func set_item(new_item: ItemData, new_quantity: int = 1):
	item = new_item
	quantity = new_quantity
	_update_display()

## Clear the slot
func clear():
	item = null
	quantity = 0
	_update_display()

## Update visual display
func _update_display():
	if item and icon:
		icon.texture = item.icon
		icon.visible = true
	elif icon:
		icon.texture = null
		icon.visible = false

	if quantity_label:
		if item and item.stackable and quantity > 1:
			quantity_label.text = str(quantity)
			quantity_label.visible = true
		else:
			quantity_label.visible = false

	if selection_border:
		selection_border.visible = is_selected

## Set selection state
func set_selected(selected: bool):
	is_selected = selected
	if selection_border:
		selection_border.visible = selected

## Show cooldown overlay (for skill slots)
func show_cooldown(percent: float):
	if cooldown_overlay:
		cooldown_overlay.visible = percent > 0
		cooldown_overlay.size.y = size.y * percent

## Check if slot accepts item type (for equipment slots)
func accepts_item(check_item: ItemData) -> bool:
	if not is_equipment_slot:
		return true

	if not check_item:
		return false

	match slot_type:
		Constants.EquipSlot.WEAPON:
			return check_item.item_type == Constants.ItemType.WEAPON
		Constants.EquipSlot.OFF_HAND:
			return check_item.item_type in [Constants.ItemType.WEAPON, Constants.ItemType.ARMOR]
		Constants.EquipSlot.HEAD, Constants.EquipSlot.BODY, \
		Constants.EquipSlot.HANDS, Constants.EquipSlot.FEET:
			return check_item.item_type == Constants.ItemType.ARMOR
		Constants.EquipSlot.ACCESSORY:
			return check_item.item_type == Constants.ItemType.ACCESSORY
		_:
			return true

## Get drag data for drag-and-drop
func _get_drag_data(_pos: Vector2):
	if not item or is_locked:
		return null

	# Create drag preview
	var preview := TextureRect.new()
	preview.texture = item.icon
	preview.custom_minimum_size = Vector2(32, 32)
	preview.modulate.a = 0.7
	set_drag_preview(preview)

	return self

## Check if can drop here
func _can_drop_data(_pos: Vector2, data) -> bool:
	if is_locked:
		return false
	if not data is InventorySlot:
		return false

	var from_slot: InventorySlot = data
	if from_slot == self:
		return false

	# Check equipment slot compatibility
	if is_equipment_slot and from_slot.item:
		return accepts_item(from_slot.item)

	return true

## Handle drop
func _drop_data(_pos: Vector2, data):
	if data is InventorySlot:
		item_dropped.emit(data, self)

class_name ActionBar
extends HBoxContainer
## 6-slot action bar at the bottom of the screen.
## Slots: 4 consumable hotkeys (1-4), dash (Space), weapon skill (5).
## Handles cooldown sweep animations, hotkey input, and slot state management.

# ── Constants ───────────────────────────────────────────────────────────────
const SLOT_COUNT: int = 6
const SLOT_SIZE: Vector2 = Vector2(56, 56)
const SLOT_SPACING: int = 10

const HOTKEY_LABELS: Array[String] = ["1", "2", "3", "4", "Space", "5"]
const HOTKEY_ACTIONS: Array[String] = [
	"hotbar_1", "hotbar_2", "hotbar_3", "hotbar_4", "dash", "hotbar_5"
]

# Slot indices
const SLOT_CONSUMABLE_START: int = 0
const SLOT_CONSUMABLE_END: int = 3  # Inclusive
const SLOT_DASH: int = 4
const SLOT_WEAPON_SKILL: int = 5

# Visual states
enum SlotState { EMPTY, READY, ON_COOLDOWN, DISABLED }

# ── Inner Class ─────────────────────────────────────────────────────────────

class ActionBarSlot extends PanelContainer:
	## A single action bar slot with icon, hotkey label, cooldown overlay,
	## and stack count display.

	var icon_rect: TextureRect
	var hotkey_label: Label
	var cooldown_overlay: ColorRect
	var cooldown_label: Label
	var quantity_label: Label

	var slot_index: int = 0
	var item_ref: Variant = null  # Item or ability reference
	var cooldown_remaining: float = 0.0
	var cooldown_total: float = 0.0
	var current_state: int = SlotState.EMPTY  # ActionBar.SlotState
	var stack_count: int = 0

	func _init(index: int) -> void:
		slot_index = index
		custom_minimum_size = ActionBar.SLOT_SIZE
		mouse_filter = Control.MOUSE_FILTER_STOP
		tooltip_text = ""

	func build_ui() -> void:
		# Background style
		var bg := StyleBoxFlat.new()
		bg.bg_color = UIConstants.BG_MEDIUM
		bg.border_color = UIConstants.BORDER
		bg.set_border_width_all(2)
		bg.set_corner_radius_all(4)
		add_theme_stylebox_override("panel", bg)

		# Icon
		icon_rect = TextureRect.new()
		icon_rect.custom_minimum_size = Vector2(32, 32)
		icon_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		icon_rect.expand_mode = TextureRect.EXPAND_FIT_WIDTH_PROPORTIONAL
		icon_rect.anchors_preset = Control.PRESET_CENTER
		icon_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(icon_rect)

		# Hotkey label (top-left corner)
		hotkey_label = Label.new()
		hotkey_label.text = ActionBar.HOTKEY_LABELS[slot_index] if slot_index < ActionBar.HOTKEY_LABELS.size() else ""
		hotkey_label.add_theme_font_size_override("font_size", UIConstants.FONT_SIZES["tiny"])
		hotkey_label.add_theme_color_override("font_color", UIConstants.TEXT_MUTED)
		hotkey_label.position = Vector2(4, 2)
		hotkey_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(hotkey_label)

		# Cooldown overlay (covers entire slot, semi-transparent)
		cooldown_overlay = ColorRect.new()
		cooldown_overlay.color = Color(0.0, 0.0, 0.0, 0.6)
		cooldown_overlay.visible = false
		cooldown_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
		cooldown_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		add_child(cooldown_overlay)

		# Cooldown time label (center of overlay)
		cooldown_label = Label.new()
		cooldown_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		cooldown_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		cooldown_label.add_theme_font_size_override("font_size", UIConstants.FONT_SIZES["body"])
		cooldown_label.add_theme_color_override("font_color", UIConstants.TEXT_PRIMARY)
		cooldown_label.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
		cooldown_label.visible = false
		cooldown_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(cooldown_label)

		# Stack/quantity label (bottom-right corner)
		quantity_label = Label.new()
		quantity_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		quantity_label.add_theme_font_size_override("font_size", UIConstants.FONT_SIZES["small"])
		quantity_label.add_theme_color_override("font_color", UIConstants.TEXT_PRIMARY)
		quantity_label.anchor_left = 1.0
		quantity_label.anchor_top = 1.0
		quantity_label.anchor_right = 1.0
		quantity_label.anchor_bottom = 1.0
		quantity_label.offset_left = -24.0
		quantity_label.offset_top = -18.0
		quantity_label.offset_right = -4.0
		quantity_label.offset_bottom = -2.0
		quantity_label.visible = false
		quantity_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(quantity_label)

		_update_visual_state()

	func set_slot_data(data: Dictionary) -> void:
		item_ref = data.get("item", null)
		stack_count = data.get("count", 0)
		cooldown_total = data.get("cooldown_total", 0.0)
		cooldown_remaining = data.get("cooldown_remaining", 0.0)

		# Set icon
		var icon_path: String = data.get("icon", "")
		if not icon_path.is_empty() and ResourceLoader.exists(icon_path):
			icon_rect.texture = load(icon_path)
			icon_rect.modulate = Color.WHITE
		else:
			icon_rect.texture = null

		# Tooltip
		tooltip_text = data.get("name", "")
		if tooltip_text.is_empty() and item_ref == null:
			tooltip_text = "Empty"

		# Determine state
		if item_ref == null and icon_path.is_empty():
			current_state = SlotState.EMPTY
		elif cooldown_remaining > 0.0:
			current_state = SlotState.ON_COOLDOWN
		elif data.get("disabled", false):
			current_state = SlotState.DISABLED
		else:
			current_state = SlotState.READY

		_update_visual_state()

	func update_cooldown(delta: float) -> void:
		if cooldown_remaining <= 0.0:
			return

		cooldown_remaining = maxf(cooldown_remaining - delta, 0.0)

		if cooldown_remaining <= 0.0:
			current_state = SlotState.READY if item_ref != null else SlotState.EMPTY
			_update_visual_state()
			return

		# Update cooldown sweep overlay
		var ratio: float = cooldown_remaining / maxf(cooldown_total, 0.01)
		cooldown_overlay.visible = true
		# Simulate radial fill by adjusting overlay height from top
		cooldown_overlay.size.y = SLOT_SIZE.y * ratio
		cooldown_overlay.position.y = SLOT_SIZE.y * (1.0 - ratio)

		# Show remaining time
		cooldown_label.visible = true
		if cooldown_remaining >= 1.0:
			cooldown_label.text = "%d" % ceili(cooldown_remaining)
		else:
			cooldown_label.text = "%.1f" % cooldown_remaining

	func _update_visual_state() -> void:
		var bg: StyleBoxFlat = get_theme_stylebox("panel").duplicate() as StyleBoxFlat
		if not bg:
			return

		match current_state:
			SlotState.EMPTY:
				bg.bg_color = UIConstants.BG_DARKEST
				bg.border_color = UIConstants.BORDER
				icon_rect.modulate = Color(1, 1, 1, 0.3)
				cooldown_overlay.visible = false
				cooldown_label.visible = false
				quantity_label.visible = false

			SlotState.READY:
				bg.bg_color = UIConstants.BG_MEDIUM
				bg.border_color = UIConstants.BORDER_BRIGHT
				icon_rect.modulate = Color.WHITE
				cooldown_overlay.visible = false
				cooldown_label.visible = false
				# Show quantity for consumables
				if stack_count > 1:
					quantity_label.text = str(stack_count)
					quantity_label.visible = true
				elif stack_count == 1:
					quantity_label.visible = false
				else:
					quantity_label.visible = false

			SlotState.ON_COOLDOWN:
				bg.bg_color = UIConstants.BG_DARK
				bg.border_color = UIConstants.BORDER
				icon_rect.modulate = Color(0.5, 0.5, 0.5, 1.0)
				# cooldown_overlay managed by update_cooldown()

			SlotState.DISABLED:
				bg.bg_color = UIConstants.BG_DARKEST
				bg.border_color = Color(UIConstants.BORDER, 0.5)
				icon_rect.modulate = Color(0.3, 0.3, 0.3, 0.6)
				cooldown_overlay.visible = false
				cooldown_label.visible = false
				quantity_label.visible = false

		add_theme_stylebox_override("panel", bg)

		# Dash slot gets a special accent border
		if slot_index == ActionBar.SLOT_DASH and current_state == SlotState.READY:
			bg.border_color = UIConstants.STAMINA_BAR

		# Weapon skill slot accent
		if slot_index == ActionBar.SLOT_WEAPON_SKILL and current_state == SlotState.READY:
			bg.border_color = UIConstants.MP_BAR


# ── Slot Array ──────────────────────────────────────────────────────────────
var slots: Array[ActionBarSlot] = []

# ── Lifecycle ───────────────────────────────────────────────────────────────

func _ready() -> void:
	alignment = BoxContainer.ALIGNMENT_CENTER
	add_theme_constant_override("separation", SLOT_SPACING)

	_build_slots()

	# Connect to game state for enabling/disabling
	if EventBus.has_signal("game_state_changed"):
		EventBus.game_state_changed.connect(_on_game_state_changed)


func _process(delta: float) -> void:
	for slot in slots:
		slot.update_cooldown(delta)


func _unhandled_input(event: InputEvent) -> void:
	if not visible:
		return

	for i in range(SLOT_COUNT):
		var action: String = HOTKEY_ACTIONS[i]
		if event.is_action_pressed(action):
			use_slot(i)
			get_viewport().set_input_as_handled()
			return


# ── Public API ──────────────────────────────────────────────────────────────

func update_slot(index: int, data: Dictionary) -> void:
	if index < 0 or index >= slots.size():
		push_warning("[ActionBar] Invalid slot index: %d" % index)
		return
	slots[index].set_slot_data(data)


func use_slot(index: int) -> void:
	if index < 0 or index >= slots.size():
		return

	var slot: ActionBarSlot = slots[index]

	# Cannot use empty, cooling down, or disabled slots
	if slot.current_state != SlotState.READY:
		return

	# Emit appropriate EventBus signal based on slot type
	match index:
		SLOT_DASH:
			if EventBus.has_signal("player_dodge_start"):
				EventBus.player_dodge_start.emit(null, Vector2.ZERO)
		SLOT_WEAPON_SKILL:
			if EventBus.has_signal("player_spell_cast"):
				EventBus.player_spell_cast.emit("weapon_skill", Vector2.ZERO)
		_:
			# Consumable slots (0-3)
			if EventBus.has_signal("player_attacked"):
				# Use a generic consumable-use signal pattern
				pass
			_use_consumable_slot(index)


func get_slot_state(index: int) -> int:
	if index < 0 or index >= slots.size():
		return SlotState.EMPTY
	return slots[index].current_state


func set_slot_cooldown(index: int, duration: float) -> void:
	if index < 0 or index >= slots.size():
		return
	slots[index].cooldown_total = duration
	slots[index].cooldown_remaining = duration
	slots[index].current_state = SlotState.ON_COOLDOWN


# ── Private ─────────────────────────────────────────────────────────────────

func _build_slots() -> void:
	for i in range(SLOT_COUNT):
		var slot := ActionBarSlot.new(i)
		slot.build_ui()
		add_child(slot)
		slots.append(slot)


func _use_consumable_slot(index: int) -> void:
	var slot: ActionBarSlot = slots[index]
	if slot.item_ref == null:
		return

	# Decrement stack count
	slot.stack_count = maxi(slot.stack_count - 1, 0)

	# Start cooldown if item has one
	if slot.cooldown_total > 0.0:
		slot.cooldown_remaining = slot.cooldown_total
		slot.current_state = SlotState.ON_COOLDOWN

	# Clear slot if no more stacks
	if slot.stack_count <= 0:
		slot.set_slot_data({})

	slot._update_visual_state()


# ── Signal Handlers ─────────────────────────────────────────────────────────

func _on_game_state_changed(_old_state: int, new_state: int) -> void:
	# Disable all slots when not in gameplay
	var in_gameplay: bool = new_state in [
		Constants.GameState.PLAYING,
		Constants.GameState.COMBAT,
	]

	for slot in slots:
		if not in_gameplay and slot.current_state == SlotState.READY:
			slot.current_state = SlotState.DISABLED
			slot._update_visual_state()
		elif in_gameplay and slot.current_state == SlotState.DISABLED:
			if slot.item_ref != null:
				slot.current_state = SlotState.READY
			else:
				slot.current_state = SlotState.EMPTY
			slot._update_visual_state()

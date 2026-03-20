class_name CombatLog
extends PanelContainer
## Scrolling combat log with color-coded messages and auto-fade.
## Supports BBCode formatting, expandable view, and connects to
## EventBus combat/loot/xp signals.

# ── Constants ───────────────────────────────────────────────────────────────
const MAX_MESSAGES: int = 50
const VISIBLE_MESSAGES: int = 5
const MESSAGE_FADE_TIME: float = 8.0  # Seconds before a message starts fading
const FADE_DURATION: float = 2.0  # Seconds to fully fade out

const EXPANDED_VISIBLE: int = 20  # Messages shown in expanded mode

# Message type -> color mapping
const TYPE_COLORS: Dictionary = {
	"damage":   Color("#FF4444"),
	"heal":     Color("#44FF44"),
	"info":     Color("#FFFFFF"),
	"loot":     Color("#FFD700"),
	"xp":       Color("#9966FF"),
	"system":   Color("#AAAAAA"),
	"critical": Color("#FF0000"),
}

# ── Nodes ───────────────────────────────────────────────────────────────────
@onready var scroll_container: ScrollContainer = %LogScrollContainer
@onready var message_container: VBoxContainer = %MessageContainer

# ── State ───────────────────────────────────────────────────────────────────
var message_history: Array[Dictionary] = []
var _is_expanded: bool = false
var _message_labels: Array[RichTextLabel] = []

# ── Lifecycle ───────────────────────────────────────────────────────────────

func _ready() -> void:
	# Build initial pool of RichTextLabel nodes
	_build_label_pool(VISIBLE_MESSAGES)

	# Style the panel background
	var bg_style := StyleBoxFlat.new()
	bg_style.bg_color = Color(UIConstants.BG_DARKEST.r, UIConstants.BG_DARKEST.g, UIConstants.BG_DARKEST.b, 0.7)
	bg_style.set_corner_radius_all(4)
	bg_style.set_border_width_all(1)
	bg_style.border_color = UIConstants.BORDER
	add_theme_stylebox_override("panel", bg_style)

	# Connect EventBus signals
	if EventBus.has_signal("player_hit_enemy"):
		EventBus.player_hit_enemy.connect(_on_player_hit_enemy)
	if EventBus.has_signal("player_critical_hit"):
		EventBus.player_critical_hit.connect(_on_player_critical_hit)
	if EventBus.has_signal("player_took_damage"):
		EventBus.player_took_damage.connect(_on_player_took_damage)
	if EventBus.has_signal("player_spell_heal"):
		EventBus.player_spell_heal.connect(_on_player_spell_heal)
	if EventBus.has_signal("enemy_death"):
		EventBus.enemy_death.connect(_on_enemy_death)
	if EventBus.has_signal("floor_advanced"):
		EventBus.floor_advanced.connect(_on_floor_advanced)
	if EventBus.has_signal("player_spell_cast"):
		EventBus.player_spell_cast.connect(_on_player_spell_cast)
	if EventBus.has_signal("player_boon_selected"):
		EventBus.player_boon_selected.connect(_on_player_boon_selected)
	if EventBus.has_signal("stamina_exhausted"):
		EventBus.stamina_exhausted.connect(_on_stamina_exhausted)
	if EventBus.has_signal("hazard_damage"):
		EventBus.hazard_damage.connect(_on_hazard_damage)


func _process(_delta: float) -> void:
	_update_message_fade()


# ── Public API ──────────────────────────────────────────────────────────────

func add_message(text: String, type: String = "info") -> void:
	var timestamp: float = Time.get_ticks_msec() / 1000.0

	var msg: Dictionary = {
		"text": text,
		"color": TYPE_COLORS.get(type, TYPE_COLORS["info"]),
		"timestamp": timestamp,
		"type": type,
	}
	message_history.append(msg)

	# Trim to max history
	while message_history.size() > MAX_MESSAGES:
		message_history.pop_front()

	_refresh_display()
	_scroll_to_bottom()


func toggle_expanded() -> void:
	_is_expanded = not _is_expanded

	var target_count: int = EXPANDED_VISIBLE if _is_expanded else VISIBLE_MESSAGES
	_build_label_pool(target_count)
	_refresh_display()

	# Resize the panel for expanded mode
	if _is_expanded:
		custom_minimum_size.y = 300.0
	else:
		custom_minimum_size.y = 0.0

	_scroll_to_bottom()


func clear_messages() -> void:
	message_history.clear()
	_refresh_display()


func is_expanded() -> bool:
	return _is_expanded


# ── Display ─────────────────────────────────────────────────────────────────

func _build_label_pool(count: int) -> void:
	# Remove excess labels
	while _message_labels.size() > count:
		var label: RichTextLabel = _message_labels.pop_back()
		label.queue_free()

	# Add missing labels
	while _message_labels.size() < count:
		var label := RichTextLabel.new()
		label.bbcode_enabled = true
		label.fit_content = true
		label.scroll_active = false
		label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		label.add_theme_font_size_override("normal_font_size", UIConstants.FONT_SIZES["small"])
		label.visible = false
		message_container.add_child(label)
		_message_labels.append(label)


func _refresh_display() -> void:
	var display_count: int = EXPANDED_VISIBLE if _is_expanded else VISIBLE_MESSAGES
	var start_idx: int = maxi(0, message_history.size() - display_count)

	for i in range(_message_labels.size()):
		var label: RichTextLabel = _message_labels[i]
		var msg_idx: int = start_idx + i

		if msg_idx < message_history.size():
			var msg: Dictionary = message_history[msg_idx]
			label.clear()

			var color: Color = msg["color"]
			var text: String = msg["text"]
			var type: String = msg["type"]

			# Critical messages get bold formatting
			if type == "critical":
				label.push_bold()
				label.push_color(color)
				label.add_text(text)
				label.pop()  # color
				label.pop()  # bold
			else:
				label.push_color(color)
				label.add_text(text)
				label.pop()

			label.visible = true
			label.modulate.a = 1.0
		else:
			label.visible = false


func _update_message_fade() -> void:
	if _is_expanded:
		# No fading in expanded mode
		return

	var now: float = Time.get_ticks_msec() / 1000.0
	var display_count: int = VISIBLE_MESSAGES
	var start_idx: int = maxi(0, message_history.size() - display_count)

	for i in range(_message_labels.size()):
		var msg_idx: int = start_idx + i
		if msg_idx < 0 or msg_idx >= message_history.size():
			continue

		var label: RichTextLabel = _message_labels[i]
		if not label.visible:
			continue

		var msg: Dictionary = message_history[msg_idx]
		var age: float = now - msg["timestamp"]

		if age > MESSAGE_FADE_TIME:
			var fade_progress: float = clampf(
				(age - MESSAGE_FADE_TIME) / FADE_DURATION, 0.0, 1.0
			)
			label.modulate.a = 1.0 - fade_progress
		else:
			label.modulate.a = 1.0


func _scroll_to_bottom() -> void:
	# Defer to ensure layout has been updated
	await get_tree().process_frame
	if is_instance_valid(scroll_container):
		scroll_container.scroll_vertical = scroll_container.get_v_scroll_bar().max_value


# ── Signal Handlers ─────────────────────────────────────────────────────────

func _on_player_hit_enemy(_player: Node, enemy: Node, damage: float, weapon_type: String) -> void:
	var enemy_name: String = _get_entity_name(enemy)
	add_message("You hit %s for %d damage (%s)" % [enemy_name, int(damage), weapon_type], "damage")


func _on_player_critical_hit(_player: Node, enemy: Node, damage: float) -> void:
	var enemy_name: String = _get_entity_name(enemy)
	add_message("CRITICAL HIT! %s takes %d damage!" % [enemy_name, int(damage)], "critical")


func _on_player_took_damage(_player: Node, amount: float, source: Node) -> void:
	var source_name: String = _get_entity_name(source)
	add_message("%s hits you for %d damage" % [source_name, int(amount)], "damage")


func _on_player_spell_heal(_player: Node, amount: float) -> void:
	add_message("Healed for %d HP" % int(amount), "heal")


func _on_enemy_death(enemy: Node, killer: Node, overkill: float) -> void:
	var enemy_name: String = _get_entity_name(enemy)
	if overkill > 0.0:
		add_message("%s defeated! (overkill: %d)" % [enemy_name, int(overkill)], "info")
	else:
		add_message("%s defeated!" % enemy_name, "info")


func _on_floor_advanced(new_floor: int, _previous_floor: int) -> void:
	add_message("Descended to Floor %d" % new_floor, "system")


func _on_player_spell_cast(spell_name: String, _position: Vector2) -> void:
	add_message("Cast %s" % spell_name, "info")


func _on_player_boon_selected(boon_id: String, ancestor: String) -> void:
	add_message("Received blessing: %s (%s)" % [boon_id, ancestor], "xp")


func _on_stamina_exhausted(_player: Node) -> void:
	add_message("Stamina exhausted!", "system")


func _on_hazard_damage(target: Node, damage: float, hazard_type: String) -> void:
	if target and target.is_in_group("player"):
		add_message("Took %d %s damage from hazard" % [int(damage), hazard_type], "damage")


# ── Helpers ─────────────────────────────────────────────────────────────────

func _get_entity_name(entity: Node) -> String:
	if not is_instance_valid(entity):
		return "Unknown"
	if entity.has_method("get_display_name"):
		return entity.get_display_name()
	if "display_name" in entity:
		return entity.display_name
	if "entity_name" in entity:
		return entity.entity_name
	return entity.name

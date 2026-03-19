class_name Helpers
extends RefCounted

## Static utility functions used throughout the game

## Clamp an integer value
static func clampi(value: int, min_val: int, max_val: int) -> int:
	return maxi(min_val, mini(max_val, value))

## Linear interpolation for integers
static func lerpi(from: int, to: int, weight: float) -> int:
	return int(from + (to - from) * weight)

## Get random element from array
static func random_element(array: Array):
	if array.is_empty():
		return null
	return array[randi() % array.size()]

## Shuffle an array in place
static func shuffle(array: Array) -> Array:
	var n := array.size()
	for i in range(n - 1, 0, -1):
		var j := randi() % (i + 1)
		var temp = array[i]
		array[i] = array[j]
		array[j] = temp
	return array

## Weighted random selection
static func weighted_random(weights: Dictionary):
	var total := 0.0
	for key in weights:
		total += weights[key]

	var roll := randf() * total
	var cumulative := 0.0

	for key in weights:
		cumulative += weights[key]
		if roll <= cumulative:
			return key

	# Fallback to first key
	return weights.keys()[0] if not weights.is_empty() else null

## Format number with commas (1000 -> 1,000)
static func format_number(num: int) -> String:
	var str_num := str(abs(num))
	var result := ""

	for i in str_num.length():
		if i > 0 and (str_num.length() - i) % 3 == 0:
			result += ","
		result += str_num[i]

	return ("-" if num < 0 else "") + result

## Format time in seconds to MM:SS
static func format_time(seconds: float) -> String:
	var mins := int(seconds) / 60
	var secs := int(seconds) % 60
	return "%02d:%02d" % [mins, secs]

## Format time to HH:MM:SS
static func format_time_long(seconds: float) -> String:
	var hours := int(seconds) / 3600
	var mins := (int(seconds) % 3600) / 60
	var secs := int(seconds) % 60
	return "%02d:%02d:%02d" % [hours, mins, secs]

## Convert grid position to world position
static func grid_to_world(grid_pos: Vector2i) -> Vector2:
	return Vector2(grid_pos) * Constants.TILE_SIZE

## Convert world position to grid position
static func world_to_grid(world_pos: Vector2) -> Vector2i:
	return Vector2i(
		int(world_pos.x / Constants.TILE_SIZE),
		int(world_pos.y / Constants.TILE_SIZE)
	)

## Get Manhattan distance between two grid positions
static func manhattan_distance(a: Vector2i, b: Vector2i) -> int:
	return abs(a.x - b.x) + abs(a.y - b.y)

## Get Chebyshev distance (allows diagonal)
static func chebyshev_distance(a: Vector2i, b: Vector2i) -> int:
	return maxi(abs(a.x - b.x), abs(a.y - b.y))

## Check if a position is adjacent to another (8-directional)
static func is_adjacent(a: Vector2i, b: Vector2i) -> bool:
	return chebyshev_distance(a, b) == 1

## Get all adjacent positions (8-directional)
static func get_adjacent_positions(pos: Vector2i) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	for dir in Constants.ALL_DIRECTIONS:
		result.append(pos + dir)
	return result

## Get cardinal adjacent positions (4-directional)
static func get_cardinal_adjacent(pos: Vector2i) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	for dir in Constants.CARDINAL_DIRECTIONS:
		result.append(pos + dir)
	return result

## Lerp color
static func lerp_color(from: Color, to: Color, weight: float) -> Color:
	return Color(
		lerpf(from.r, to.r, weight),
		lerpf(from.g, to.g, weight),
		lerpf(from.b, to.b, weight),
		lerpf(from.a, to.a, weight)
	)

## Ease in out quad
static func ease_in_out_quad(t: float) -> float:
	if t < 0.5:
		return 2.0 * t * t
	return 1.0 - pow(-2.0 * t + 2.0, 2) / 2.0

## Ease out back (overshoot)
static func ease_out_back(t: float) -> float:
	const c1 := 1.70158
	const c3 := c1 + 1
	return 1.0 + c3 * pow(t - 1.0, 3) + c1 * pow(t - 1.0, 2)

## Create a unique ID
static func create_uid() -> String:
	return "%d_%d" % [Time.get_unix_time_from_system(), randi()]

## Deep copy a dictionary
static func deep_copy_dict(dict: Dictionary) -> Dictionary:
	var result := {}
	for key in dict:
		var value = dict[key]
		if value is Dictionary:
			result[key] = deep_copy_dict(value)
		elif value is Array:
			result[key] = deep_copy_array(value)
		else:
			result[key] = value
	return result

## Deep copy an array
static func deep_copy_array(arr: Array) -> Array:
	var result := []
	for item in arr:
		if item is Dictionary:
			result.append(deep_copy_dict(item))
		elif item is Array:
			result.append(deep_copy_array(item))
		else:
			result.append(item)
	return result

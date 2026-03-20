class_name SeededRNG
extends RefCounted
## Mulberry32 deterministic pseudo-random number generator.
## Provides reproducible random sequences from a given seed value.
## Supports integer, float, gaussian, weighted choice, and child RNG creation.

var seed_value: int
var initial_seed: int
var state: int
var call_count: int = 0


func _init(p_seed: Variant = null) -> void:
	set_seed_value(p_seed)


func set_seed_value(p_seed: Variant) -> void:
	if p_seed == null:
		p_seed = randi()
	if p_seed is String:
		p_seed = _hash_string(p_seed)
	seed_value = p_seed & 0xFFFFFFFF
	initial_seed = seed_value
	state = seed_value
	call_count = 0


## Returns a float in [0, 1) using Mulberry32 algorithm.
func random() -> float:
	call_count += 1
	return _mulberry32()


func _mulberry32() -> float:
	state = (state + 0x6D2B79F5) & 0xFFFFFFFF
	var t: int = state
	t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
	t = (t ^ (t + ((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
	return float((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0


## Returns a random integer in [min_val, max_val] inclusive.
func random_int(min_val: int, max_val: int) -> int:
	return int(random() * (max_val - min_val + 1)) + min_val


## Returns true with the given probability (0.0 to 1.0).
func chance(probability: float) -> bool:
	return random() < probability


## Returns a random element from the array.
func choose(array: Array) -> Variant:
	if array.is_empty():
		return null
	return array[int(random() * array.size()) % array.size()]


## Fisher-Yates shuffle in place. Returns the same array.
func shuffle(array: Array) -> Array:
	for i in range(array.size() - 1, 0, -1):
		var j := int(random() * (i + 1))
		var tmp = array[i]
		array[i] = array[j]
		array[j] = tmp
	return array


## Weighted random selection. Items and weights arrays must be same size.
func weighted_choice(items: Array, weights: Array) -> Variant:
	var total := 0.0
	for w in weights:
		total += w
	var roll := random() * total
	for i in items.size():
		roll -= weights[i]
		if roll <= 0:
			return items[i]
	return items.back()


## Box-Muller transform for normally distributed random values.
func gaussian(mean: float = 0.0, std_dev: float = 1.0) -> float:
	var u1 := maxf(random(), 0.0001)
	var u2 := random()
	var z0 := sqrt(-2.0 * log(u1)) * cos(TAU * u2)
	return z0 * std_dev + mean


## Creates a child RNG with a deterministic seed derived from this RNG's seed and a name.
func child(child_name: String) -> SeededRNG:
	return SeededRNG.new(_hash_string("%d_%s" % [seed_value, child_name]))


## Serializes the RNG state for save/load.
func get_state() -> Dictionary:
	return {
		"seed": seed_value,
		"initial_seed": initial_seed,
		"state": state,
		"call_count": call_count,
	}


## Restores the RNG state from a dictionary.
func load_state(data: Dictionary) -> void:
	seed_value = data.get("seed", 0)
	initial_seed = data.get("initial_seed", 0)
	state = data.get("state", 0)
	call_count = data.get("call_count", 0)


## DJB2-style string hash.
func _hash_string(s: String) -> int:
	var hash_val: int = 0
	for i in s.length():
		hash_val = ((hash_val << 5) - hash_val + s.unicode_at(i)) & 0xFFFFFFFF
	return hash_val

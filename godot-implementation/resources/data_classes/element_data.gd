class_name ElementData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""
@export var element: Constants.Element = Constants.Element.NONE
@export var color: Color = Color.WHITE
@export var theme: String = ""
@export var status_effect: String = ""         # Status effect applied by this element

@export_group("Relationships")
@export var strong_against: Array[Constants.Element] = []
@export var weak_against: Array[Constants.Element] = []
@export var complementary: Constants.Element = Constants.Element.NONE

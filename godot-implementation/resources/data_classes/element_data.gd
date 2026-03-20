class_name ElementData
extends Resource

@export var id: String = ""
@export var display_name: String = ""
@export var element: Constants.Element = Constants.Element.NONE
@export var color: Color = Color.WHITE
@export var theme: String = ""
@export var status_effect: String = ""         # Status effect applied by this element
@export var opposed_by: Array[Constants.Element] = []
@export var complements: Array[Constants.Element] = []

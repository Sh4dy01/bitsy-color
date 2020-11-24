/* PALETTE TOOL STUFF
TODO:
- is PaletteTool the best name?
- should it create its own color picker?
*/
function PaletteTool(colorPicker,nameFieldId) { //,colorCallback
	var self = this;

	var colorPickerIndex = 0;

	var curPaletteId = sortedPaletteIdList()[0];

	function UpdatePaletteUI() {
		// update name field
		var palettePlaceholderName = localization.GetStringOrFallback("palette_label", "palette");
		document.getElementById(nameFieldId).placeholder = palettePlaceholderName + " " + GetSelectedId();
		var name = palette[ GetSelectedId() ].name;
		if( name ) {
			document.getElementById(nameFieldId).value = name;
		}
		else {
			document.getElementById(nameFieldId).value = "";
		}

		updateColorPickerUI();
	}

	events.Listen("game_data_change", function(event) {
		// make sure we have valid palette id
		if (palette[curPaletteId] === undefined || curPaletteId === "default") {
			if (sortedPaletteIdList().length > 0) {
				curPaletteId = sortedPaletteIdList()[0];
			}
			else {
				curPaletteId = "default";
			}
		}

		UpdatePaletteUI();
    });

    function addButtons(index) {

    }

	// public
	function changeColorPickerIndex(index) {
		colorPickerIndex = index;
		var color = getPal(GetSelectedId())[ index ];
		// console.log(color);
        colorPicker.setColor(color[0], color[1], color[2]);

        //only the the intial colors have this
        for (i = 0; i < 3; i++) {
            var children = document.getElementById("colorLabel_" + i).children;
            if (i != colorPickerIndex) {
                console.log("no text");
                children[1].style.display = 'none';
            } else {
                console.log("see text");
                children[1].style.display = 'inline';
            }
        }
	}
	this.changeColorPickerIndex = changeColorPickerIndex;

	function updateColorPickerLabel(index, r, g, b) {
		var rgbColor = {r:r, g:g, b:b};

		var rgbColorStr = "rgb(" + rgbColor.r + "," + rgbColor.g + "," + rgbColor.b + ")";
		var hsvColor = RGBtoHSV( rgbColor );
        document.getElementById("colorLabel_" + index).style.background = rgbColorStr;


        document.getElementById("colorLabel_" + index)
			.setAttribute("class", hsvColor.v < 0.5 ? "colorPaletteLabelDark" : "colorPaletteLabelLight");
	}
    
	// public
	function updateColorPickerUI() {
        var colors = getPal(GetSelectedId());

        for (i = 0; i < colors.length; i++) {
            var temp = getPal(GetSelectedId())[i];
            colors[i] = temp;

            updateColorPickerLabel(i, temp[0], temp[1], temp[2]);

        }

		changeColorPickerIndex( colorPickerIndex );
	}
	this.updateColorPickerUI = updateColorPickerUI;

    events.Listen("color_picker_change", function (event) {
		getPal(GetSelectedId())[ colorPickerIndex ][ 0 ] = event.rgbColor.r;
		getPal(GetSelectedId())[ colorPickerIndex ][ 1 ] = event.rgbColor.g;
		getPal(GetSelectedId())[ colorPickerIndex ][ 2 ] = event.rgbColor.b;
		renderer.SetPalettes(palette); // TODO: having to directly interface w/ the renderer is probably bad

		updateColorPickerLabel(colorPickerIndex, event.rgbColor.r, event.rgbColor.g, event.rgbColor.b );

		if( event.isMouseUp && !events.IsEventActive("game_data_change") ) {
			events.Raise("palette_change"); // TODO -- try including isMouseUp and see if we can update more stuff live
		}
	});

	function SelectPrev() {
		var idList = sortedPaletteIdList();
		var index = idList.indexOf(curPaletteId);

		index--;
		if (index < 0) {
			index = idList.length - 1;
		}

		curPaletteId = idList[index];

		UpdatePaletteUI();
	}
	this.SelectPrev = SelectPrev;

	this.SelectNext = function() {
		var idList = sortedPaletteIdList();
		var index = idList.indexOf(curPaletteId);

		index++;
		if (index >= idList.length) {
			index = 0;
		}

		curPaletteId = idList[index];

		UpdatePaletteUI();
	}

	this.AddNew = function() {
		// create new palette and save the data
        var id = nextPaletteId();
        var lastId = curPaletteId;

		palette[ id ] = {
			name : null,
			colors : [
			hslToRgb(Math.random(), 1.0, 0.5),
			hslToRgb(Math.random(), 1.0, 0.5),
			hslToRgb(Math.random(), 1.0, 0.5) ]
		};
        if (palette[id].colors.length != palette[lastId].colors.length) {
            for (i = 2; i < palette[lastId].colors.length; i++) {
                palette[id].colors[i] = hslToRgb(Math.random(), 1.0, Math.random());
            }
        }

		curPaletteId = id;
		UpdatePaletteUI();

		events.Raise("palette_list_change");
	}

	this.AddDuplicate = function() {
		var sourcePalette = palette[curPaletteId] === undefined ? palette["default"] : palette[curPaletteId];
		var curColors = sourcePalette.colors;

		var id = nextPaletteId();
		palette[ id ] = {
			name : null,
			colors : []
		};

		for (var i = 0; i < curColors.length; i++) {
			palette[id].colors.push(curColors[i].slice());
		}

		curPaletteId = id;
		UpdatePaletteUI();

		events.Raise("palette_list_change");
	}

	this.DeleteSelected = function() {
		if (sortedPaletteIdList().length <= 1) {
			alert("You can't delete your only palette!");
		}
		else if (confirm("Are you sure you want to delete this palette?")) {
			delete palette[curPaletteId];

			// replace palettes for rooms using the current palette
			var replacementPalId = sortedPaletteIdList()[0];
			var roomIdList = sortedRoomIdList();
			for (var i = 0; i < roomIdList.length; i++) {
				var roomId = roomIdList[i];
				if (room[roomId].pal === curPaletteId) {
					room[roomId].pal = replacementPalId;
				}
			}

			SelectPrev();

			events.Raise("palette_list_change");
		}
	}

    this.AddColor = function () {

        var id = curPaletteId;
        var colors = palette[id].colors;
        colors.push(hslToRgb(Math.random(), 1.0, Math.random()));
        
        UpdatePaletteUI();

        events.Raise("palette_change");
    }

	function GetSelectedId() {
		if (sortedPaletteIdList().length <= 0) {
			return "default";
		}
		else {
			return curPaletteId;
		}
	}
	this.GetSelectedId = GetSelectedId;

	this.ChangeSelectedPaletteName = function(name) {
		var obj = palette[ GetSelectedId() ];
		if(name.length > 0) {
			obj.name = name;
		}
		else {
			obj.name = null;
		}

		updateNamesFromCurData() // TODO ... this should really be an event?

		events.Raise("palette_list_change");
	}

	// init yourself
	UpdatePaletteUI();
}
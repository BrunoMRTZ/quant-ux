
import Group from 'canvas/controller/Group'
import lang from 'dojo/_base/lang'

export default class CopyPaste extends Group{

	constructor () {
		super()
		this.borderPropsAttributes = ["borderBottom", "borderLeft", "borderRight", "borderTop"]

		this.borderStyleAttributes = ["borderColor", "borderWidth", "borderRadius", "borderTopWidth",
									  "borderBottomWidth", "borderLeftWidth", "borderRightWidth" ,
									  "borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", 
									  "borderBottomRightRadius", "borderTopColor", "borderBottomColor", 
									  "borderRightColor", "borderLeftColor"]

		this.textStyleAttributes = ["color", "fontFamily", "fontSize", "line-height", "fontStyle", 
									"fontWeight", "textAlign", "letter-spacing", "textShadow", 
									"textDecoration", "verticalAlign" ]

		this.backStyleAttributes = ["background", "boxShadow" ,"opacity"]

		this.copyNullValues =  {"boxShadow": true}
	}

	replicateWidgets (ids, pos, selectedGroup, fromToolbar){
		this.logger.log(0,"replicateWidgets", "enter > ");	
		
		/**
		 * This was id!!!
		 */
		pos = this.correctPostion(ids, pos, fromToolbar);
					
		var cloneIds = this.modelAddClonedWidgets(ids, pos, selectedGroup)
		
		/**
		 * make command 
		 */
		var command = {
			timestamp : new Date().getTime(),
			type : "WidgetReplicate",
			sourceIds: ids,
			sourcePos: pos,
			clonedIds: cloneIds,
			group: selectedGroup
		};
		
		this.addCommand(command);
		this.render();
		return cloneIds;
	}
	
	modelAddClonedWidgets (ids, pos,selectedGroup, undoIds) {
		var clonedIds = {
			widgets: [],
			groups: [],
		};
		
		var targetScreen = this.getHoverScreen(pos);
		
		/**
		 * FIXME: copy the group stuff as well!
		 */
		var groups = []
		var clonePos = this.getClones(ids, pos).clones;
		for (var i=0; i< clonePos.length; i++) {
			var cPos = clonePos[i];
			if(this.model.widgets[cPos.cloneOff]){
				var widget = this.model.widgets[cPos.cloneOff];
				
				var clonedWidget = this._copyWidget(widget, targetScreen);
				/**
				 * In case of redo, we have to use the same ids, so 
				 * undo works again...
				 */
				if (undoIds && undoIds[i]){
					clonedWidget.id = undoIds[i];
				} else {
					clonedWidget.id = "w"+this.getUUID();
				}
				clonedWidget.x =  cPos.x;
				clonedWidget.y =  cPos.y;
				clonedWidget.copyOf = widget.id;
				clonedWidget.z = this.getMaxZValue(this.model.widgets) +1;
				delete clonedWidget.props.databinding;
				
				/**
				 * update model
				 */
				this.modelAddWidget(clonedWidget, true);
			
				clonedIds.widgets.push(clonedWidget.id)
				
				/**
				 * Check if we should create a group!
				 */
				if (selectedGroup){
					if (!groups[cPos.group]){
						let group = {
							id: "g" + this.getUUID(),
							copyOf : selectedGroup.id,
							name :  selectedGroup.name + "("  + cPos.group + ")",
							children: []
						}
						clonedIds.groups.push(group.id);
						this.modelAddGroup(group, true);
						groups[cPos.group] = group;
					}
					groups[cPos.group].children.push(clonedWidget.id)
				}
				
			} else {
				this.logger.error("modelAddClonedWidgets", "Error. No widget with id > " +cPos.cloneOff);
			}
		}
		this.onModelChanged();
		return clonedIds;
	}
	
	modelRemoveClonedWidgets (ids) {
		var widgetIDs= ids.widgets;
		/**
		 * remove widgets
		 */
		for(let i=0; i < widgetIDs.length; i++){
			let id = widgetIDs[i];
			if(this.model.widgets[id]){
				var widget = this.model.widgets[id];
				delete this.model.widgets[id];
				this.cleanUpParent(widget);
			} else {
				console.warn("modelRemoveClonedWidgets() > Could not delete widget", id);
			}
		}
		/**
		 * remove groups
		 */
		var groupIDS = ids.groups;
		for(let i=0; i < groupIDS.length; i++){
			let id = groupIDS[i];
			if(this.model.groups && this.model.groups[id]){
				delete this.model.groups[id];
			} else {
				console.warn("modelRemoveClonedWidgets() > Could not delete groud", id);
			}
		}
		this.onModelChanged();
	}
	
	undoWidgetReplicate (command){
		this.logger.log(3,"redoWidgetReplicate", "enter > " + command.id);
		this.modelRemoveClonedWidgets(command.clonedIds);
		this.unSelect();
		this.render();
	}
	
	redoWidgetReplicate (command){
		this.logger.log(3,"redoWidgetReplicate", "enter > " + command.id);
		this.modelAddClonedWidgets(command.sourceIds, command.sourcePos, command.group, command.clonedIds.widgets);
		this.render();
	}
	

	/**********************************************************************
	 * Copy Style
	 **********************************************************************/

	onCopyWidgetStyle (source, target){
		this.logger.log(0,"onCopyWidgetStyle", "enter > " +source + " > " + target);
		
		
		var from = this.getBoxById(source);
		var to = this.getBoxById(target);
		
		if(from && to){
			var isSameType = from.type == to.type;
			
			/**
			 * FIXME: Make style copy also work with templates!
			 */
			if(from.template || to.template){
				this.showError("Cannot copy style to templated elements!");
				return;
			}
			
			var fromStyle = from.style;
			var fromProps = from.props;
			
			var fromHover = from.hover;
			var fromError = from.error;
			var fromFocus = from.focus;
				
			/**
			 * First copy props, than copy styles
			 */
			var props = {};
			var style = {};
			if(isSameType || (from.has.backgroundColor && to.has.backgroundColor)){				
				for(let i=0; i< this.backStyleAttributes.length; i++){
					let attr = this.backStyleAttributes[i];
					this._copyAttribute(fromStyle, style, attr);
				}	
			}
			
			if(isSameType || (from.has.backgroundImage && to.has.backgroundImage)){				
				this._copyAttribute(fromStyle, style, "backgroundImage");
				this._copyAttribute(fromStyle, style, "opacity");
			}
			
			if(isSameType || (from.has.padding && to.has.padding)){				
				this._copyAttribute(fromStyle, style, "paddingTop");
				this._copyAttribute(fromStyle, style, "paddingBottom");
				this._copyAttribute(fromStyle, style, "paddingRight");
				this._copyAttribute(fromStyle, style, "paddingLeft");
			}
			
			
			if(isSameType || (from.has.border  && to.has.border)){				
				for(let i=0; i< this.borderStyleAttributes.length; i++){
					let attr = this.borderStyleAttributes[i];
					this._copyAttribute(fromStyle, style, attr);
				}				
				for(let i=0; i< this.borderPropsAttributes.length; i++){
					let attr = this.borderPropsAttributes[i];
					this._copyAttribute(fromProps, props, attr);
				}
			}

			if(isSameType || (from.has.label && to.has.label)){				
				for(let i=0; i< this.textStyleAttributes.length; i++){
					let attr = this.textStyleAttributes[i];
					this._copyAttribute(fromStyle, style, attr);
				}				
			}
			
			/**
			 * Now build one multi command to update props and style
			 */
			var command = {
				timestamp : new Date().getTime(),
				type : "MultiCommand",
				label : "CopyWidgetStyle",
				children :[]
			};
			
			var styleCommand = this.createWidgetPropertiesCommand(target, style, "style");
			command.children.push(styleCommand);
			
			var propsCommand = this.createWidgetPropertiesCommand(target, props, "props");
			command.children.push(propsCommand);
			
			if(fromHover){

				var hover = lang.clone(fromHover);
				var hoverCommand = this.createWidgetPropertiesCommand(target,hover , "hover");
				command.children.push(hoverCommand);
				this.modelWidgetPropertiesUpdate(target, hover, "hover");
			}
			
			if(fromError){
		
				var error = lang.clone(fromError);
				var errorCommand = this.createWidgetPropertiesCommand(target,error , "error");
				command.children.push(errorCommand);
				this.modelWidgetPropertiesUpdate(target, error, "error");
			}
			
			if(fromFocus){
			
				var focus = lang.clone(fromFocus);
				var focusCommand = this.createWidgetPropertiesCommand(target,focus,  "focus");
				command.children.push(focusCommand);
				this.modelWidgetPropertiesUpdate(target, focus, "focus");
			}
			
			this.addCommand(command);
		
			this.modelWidgetPropertiesUpdate(target, style, "style");
			this.modelWidgetPropertiesUpdate(target, props, "props");
			
			this.renderWidget(to);	
		} else {
			this.logger.error("onCopyWidgetStyle", "Could not copy > " +source + " > " + target);				
		}
	}
	
	_copyAttribute (from, to, attr){
		if(from[attr] != null){
			to[attr] = from[attr];
		} else if(this.copyNullValues[attr]){
			to[attr] = from[attr];
		}
	}
	
	
	onMultiCopyWidget (selection, pos){
		this.logger.log(2,"onMultiCopyWidget", "enter > "+pos);
	
		pos = this.getUnZoomedBox(pos, this._canvas.getZoomFactor());
		var targetScreen = this.getHoverScreen(pos);
		
		/**
		 * get the most top right position in the selection
		 */
		var parentPos = this.getBoundingBox(selection);
		
		/**
		 * 2) create mutli command
		 */
		var command = {
			timestamp : new Date().getTime(),
			type : "MultiCommand",
			label : "MultiCopyWidget",
			children :[]
		};
		
		/**
		 * create already the grou
		 */
		var newSelection = [];
		
		/**
		 * 3) copy children and add off set to top children
		 */
		for(var i=0; i < selection.length; i++){
			var id = selection[i];
			var widget = this.model.widgets[id];
			
			var newWidget = this._copyWidget(widget, targetScreen);
			newWidget.id = "w"+this.getUUID();
			
			newWidget.x =  pos.x + (newWidget.x - parentPos.x);
			newWidget.y =  pos.y + (newWidget.y - parentPos.y);
			
			if (pos.newScreen){
				this.logger.log(1,"onMultiCopyWidget", "copy on new screen: " + id);
				
				var parentScreen = this.getParentScreen(widget)
				newWidget.x =  targetScreen.x + (widget.x - parentScreen.x);
				newWidget.y =  targetScreen.y + (widget.y - parentScreen.y);
			}
			newSelection.push(newWidget.id);
		
			/**
			 * create the command
			 */
			var child = {
				timestamp : new Date().getTime(),
				type : "CopyWidget",
				model : newWidget
			};
			command.children.push(child);
			
			/**
			 * update model
			 */
			this.modelAddWidget(newWidget);
			
		}
	
		
		/**
		 * finally add command
		 */
		this.addCommand(command);
		
		/**
		 * render
		 */
		this.render();
		return newSelection;
	}
	

	
	onCopyGroup (group, pos){
		this.logger.log(-1,"onCopyGroup", "enter > ", pos);
		
		// FIXME: check if (pos.newScreen)
		pos = this.getUnZoomedBox(pos, this._canvas.getZoomFactor());
		
		/**
		 * get the most top right position in the selection
		 */
		var parentPos = this.getBoundingBox(group.children);
		var targetScreen = this.getHoverScreen(pos);
		
		/**
		 * 2) create mutli command
		 */
		var command = {
			timestamp : new Date().getTime(),
			type : "MultiCommand",
			label : "CopyGroup",
			children :[]
		};
		
		/**
		 * create already the grou
		 */
		var selection = [];
		var copyIds = {}
		/**
		 * 3) copy children and add off set to top children
		 * 
		 * - Since 2.1.3 We have subgroup. The copy works 
		 *   here because the Select class sets allChildren()!
		 * 
		 * - Make sure we add in the correct Z order
		 */
		let allChildren = this.sortChildren(group.children)	

		allChildren.forEach(widget => {
			let id = widget.id
			let newWidget = this._copyWidget(widget, targetScreen);
			newWidget.id = "w" + this.getUUID();
			newWidget.x =  pos.x + (newWidget.x - parentPos.x);
			newWidget.y =  pos.y + (newWidget.y - parentPos.y);			
			if (pos.newScreen){
				this.logger.log(1,"onCopyGroup", "copy on new screen :" + id);
				let parentScreen = this.getParentScreen(widget)
				newWidget.x =  targetScreen.x + (widget.x - parentScreen.x);
				newWidget.y =  targetScreen.y + (widget.y - parentScreen.y);
			}			
			newWidget.z = this.getMaxZValue(this.model.widgets) + 1;
			selection.push(newWidget.id);
			copyIds[id] = newWidget.id
		
			/**
			 * create the command
			 */
			let child = {
				timestamp : new Date().getTime(),
				type : "CopyWidget",
				model : newWidget
			};
			command.children.push(child);

			/**
			 * update model
			 */
			this.modelAddWidget(newWidget);			
		})
	
		/**
		 * 4) copy group
		 */
		let newGroup = this.createGroupCommands(group, copyIds, command, targetScreen)
		
		/**
		 * finally add command
		 */
		this.addCommand(command);
		
		/**
		 * render
		 */
		this.onGroupSelected(newGroup.id);
		this.render();		
		return newGroup;
	}


	createGroupCommands (group, copyIds, command, targetScreen) {

		/**
		 * First copy recursive down
		 */
		let subGroups= []
		if (group.groups) {
			group.groups.forEach(subGroupId => {
				let subGroup = this.model.groups[subGroupId]
				if (subGroup) {
					let subGroupCopy = this.createGroupCommands(subGroup, copyIds, command, targetScreen)
					subGroups.push(subGroupCopy.id)
				} else {
					this.logger.error("createGroupCommands", "could not find subgroup > " + subGroupId);
				}
			})
		}

		/**
		 * Now create real group
		 */
		let name = group.name;
		if (targetScreen){
			name = this.getGroupName(targetScreen.id, group.name)
		}
		let newGroup = {
			id : "g" + this.getUUID(),
			children : this.getGroupCopyChildren(group.id, copyIds),
			groups: subGroups,
			copyOf : group.id,
			name : name
		};

		let child = {
			timestamp : new Date().getTime(),
			type : "AddGroup",
			model : newGroup
		};
		command.children.push(child);
		this.modelAddGroup(newGroup);

		return newGroup;
	}

	getGroupCopyChildren (groupId, copyIds) {
		let group = this.model.groups[groupId]
		if (group) {
			return group.children.map(id => {
				return copyIds[id]
			}).filter(id => id !== undefined && id !== null)
		}
		console.error('CopyPaste.getGroupCopyChildren() > cannot find group', groupId) 
		return []
	}
	
	/**********************************************************************
	 * Copy Widget
	 **********************************************************************/
	
	
	
	onCopyWidget (id, pos, isEnbaleInheritedWidget){
		this.logger.log(-1,"onCopyWidget", "enter > "+ id + " > "+pos.newScreen + "> " + isEnbaleInheritedWidget) ;
	
		
		var widget = this.model.widgets[id];
		
		if(widget){
			pos = this.getUnZoomedBox(pos, this._canvas.getZoomFactor());
			var targetScreen = this.getHoverScreen(pos);
			// for copies to other screens, we take the position from the unzoomed model.
			if (pos.newScreen){
				var parentScreen = this.getParentScreen(widget);
				if (parentScreen && targetScreen) {
					pos.x = targetScreen.x + (widget.x - parentScreen.x)
					pos.y = targetScreen.y + (widget.y - parentScreen.y)
				}
			}
		
		
			/**
			 * FIXME: What about the templates widgets
			 */
			var newWidget = this._copyWidget(widget, targetScreen);
			newWidget.id = "w"+this.getUUID();
			newWidget.x =  pos.x;
			newWidget.y =  pos.y;
			newWidget.copyOf = widget.id;
			newWidget.z = this.getMaxZValue(this.model.widgets) +1;
			
			
			/**
			 * create the command
			 */
			var command = {
				timestamp : new Date().getTime(),
				type : "CopyWidget",
				model : newWidget
			};
			this.addCommand(command);
			
			/**
			 * update model
			 */
			this.modelAddWidget(newWidget);
			this.render();
			return newWidget;
		} else {
			console.warn("No Widget with id", id);
		}
	}

	
	
	undoCopyWidget (command){
		this.logger.log(3,"undoCopyWidget", "enter > " + command.id);
		var widget = command.model;
		this.modelRemoveWidget(widget);
		this.render();
	}		
	redoCopyWidget (command){
		this.logger.log(3,"redoCopyWidget", "enter > " + command.id);
		var widget = command.model;
		this.modelAddWidget(widget);
		this.render();
	}	

	_copyWidget (w, targetScreen){
		this.logger.log(3,"_copyWidget", "enter > ", targetScreen);
		if (!targetScreen){
			console.error("_copyWidget() > No screen", new Error().stack);
			targetScreen = this.getHoverScreen(w);
		}
		var copy = lang.clone(w);
		copy.copyOf = w.id;
		if (targetScreen) {
			copy.name = this.getWidgetName(targetScreen.id, w.name)
		} 
		
		/**
		 * Clean up references here
		 * 
		 * 1) errorLabels
		 * 
		 * 2) Animation references...
		 * 
		 * 3) give a name??
		 */
		if(copy.props.validation){
			delete copy.props.validation.errorLabels;
		}
		
		if(copy.children){
			copy.children = [];
		}

		if(copy.props.refs){
			delete copy.props.refs;
		}
		
		return copy;
	}
	
	/**********************************************************************
	 * Copy Widget
	 **********************************************************************/
	
	onCopyScreen (id, pos){
		this.logger.log(0,"onCopyScreen", "enter > "+ id + " "+pos);
		
		var screen = this.model.screens[id];
		
		if(screen){
			if(this._canvas){
				pos = this.getUnZoomedBox(pos, this._canvas.getZoomFactor());
			}
		
			
			var newScreen = lang.clone(screen);
			newScreen.id = "s"+this.getUUID();
			newScreen.x =  pos.x;
			newScreen.y =  pos.y;
			newScreen.name = this.getSceenName(screen.name);
			newScreen.children = [];
			delete newScreen.props.start;
			
			let children = [];
			let groups = [];
			let parentGroups ={};
			let widgetIDMapping = {};
			/**
			 * FIXME: Create a copy of all widgets too,
			 * 
			 * and create a own modelCopyScreen funtion!
			 */
			if(screen.children){
				for(let i=0; i < screen.children.length; i++){
					let widgetID = screen.children[i];
					let widget = this.model.widgets[widgetID];
					
					// we do not update the widget names!
					let newWidget = lang.clone(widget);
					newWidget.id = "w" + this.getUUID();
					newWidget.copyOf = widget.id;
					newWidget.x = pos.x + (widget.x - screen.x);
					newWidget.y = pos.y + (widget.y - screen.y);
					
					/**
					 *  Dunno if i should raise the z level. Then I would have to 
					 *  loop over the widhets in the right order.
					 */
					//newWidget.z = this.getMaxZValue(this.model.widgets) +1 + 1;
					newScreen.children.push(newWidget.id);
					
					children.push(newWidget);
					widgetIDMapping[widgetID] = newWidget.id;
					
					var parentGroup = this.getParentGroup(widgetID);
					if(parentGroup){
						parentGroups[parentGroup.id] = parentGroup;
					}
				}
			}
			
			/**
			 * Copy also groups
			 */
			for(let parentGroupID in parentGroups){
				let parentGroup = parentGroups[parentGroupID];				
				this.copyScreenGroup(parentGroup, groups, widgetIDMapping)
			}
			
			
			/**
			 * create the command
			 */
			var command = {
				timestamp : new Date().getTime(),
				type : "CopyScreen",
				model : newScreen,
				children :children,
				groups : groups
			};
			this.addCommand(command);
			
			/**
			 * update model
			 */
			this.modelAddScreenAndWidgetsAndLines(newScreen, children, null, groups);
			
			this.render();
			
			return newScreen;
		} else {
			console.warn("No screen with id", id);
		}			
	}		

	copyScreenGroup (parentGroup, groups, widgetIDMapping) {

		let subGroupIds = []
		if (parentGroup.groups) {
			parentGroup.groups.forEach(subGroupId => {
				let subGroup = this.model.groups[subGroupId]
				if (subGroup) {
					let newSubGroup = this.copyScreenGroup(subGroup, groups, widgetIDMapping)
					subGroupIds.push(newSubGroup.id)
				} else {
					this.logger.error("copyScreenGroup", "could not find subgroup > " + subGroupId);
				}
			})
		}

		let newGroup = lang.clone(parentGroup);
		newGroup.id = "g" + this.getUUID();
		newGroup.copyOf = parentGroup.id;
		newGroup.children = [];
		newGroup.groups = subGroupIds
		for (var c=0; c < parentGroup.children.length; c++) {
			var parentChildID = parentGroup.children[c];
			if (widgetIDMapping[parentChildID]){
				newGroup.children.push(widgetIDMapping[parentChildID]);
			}
		}
		groups.push(newGroup);
		this.logger.log(3,"copyScreenGroup", "enter > ", newGroup);
		return newGroup
	}

	undoCopyScreen (command){
		this.logger.log(3,"undoCopyScreen", "enter > " + command.id);
		var model = command.model;
		this.modelRemoveScreenAndWidgetAndLines(model, command.children, null, command.groups);
		this.render();
	}
	
	redoCopyScreen (command){
		this.logger.log(3,"redoCopyScreen", "enter > " + command.id);
		var model = command.model;
		this.modelAddScreenAndWidgetsAndLines(model, command.children, null, command.groups);
		this.render();
	}
}
var APIBASE = 'api/v1.0'
var map;
var divModMsg = document.createElement('div');

function addMarker(data, map) {
	if (data.lng != 0 && data.lat != 0) {
		var pos = new google.maps.LatLng(data.lat, data.lng);
		var marker = new google.maps.Marker({
	  		position:pos,
	  		title:data.name
	  	});
		marker.setMap(map);
	}
}

function goToMarker(data, map) {
	if (data.address == '') {
		divModMsg.innerHTML = 'No location to go to.  Please save your location first.';
		divModMsg.className = "alert alert-error";
		bootbox.dialog(divModMsg.outerHTML, {
		    "label" : "Continue",
		    "class" : "btn-danger",
		});	
		return;
	}
	map.setCenter(new google.maps.LatLng(data.lat, data.lng));
}

$(function() {
	$('#tabs a:first').tab('show');
	$("input .name").focus(function() { $(this).select(); } );
	$('#location-list').sortable();
	$('#location-list').disableSelection();
	
	//backbone
	var Location = Backbone.Model.extend({
		defaults: function() {
			return {
				id: '',
				lat: '',
				lng: '',
				name: '',
				address: ''
			}
		}
	});

	var LocationList = Backbone.Collection.extend({
		model: Location,
		url: APIBASE + '/location'
	});

	var locationList = new LocationList;

	var LocationView = Backbone.View.extend({
		tagName: 'li',
		template: _.template($('#location-template').html()),
		events: {
	      	"click .edit-toggle": "toggle",
      		"click a.destroy" : "clear",
      		"click .goto"  : "goto",
      		"click .save"  : "save",
      		"click .edit-close"  : "close",
      		"click .delete"  : "delete"
		},
		initialize: function() {
	    	this.listenTo(this.model, 'change', this.render);
	    	this.listenTo(this.model, 'destroy', this.remove);
	    	_.bind(this.multipleLocations, this);
	    	_.bind(this.geoSuccess, this);
	    },
	    render: function() {
	    	this.$el.html(this.template(this.model.toJSON()));
      		this.name = this.$('.name');
      		this.address = this.$('.address');
      		this.imgToggle = this.$('.toggle');
      		this.lblToggle = this.$('.lbltoggle');
      		return this;
    	},
    	toggle: function(e){
    		var me = $(e.currentTarget);
    		var show = me.hasClass('edit-toggle edit-open');
    		if (show) {
    			//edit
    			this.$el.addClass('editing');
	    		this.imgToggle.attr({'class': 'toggle minus', 'src': 'static/img/minus.png'});
	    		me.attr({'class': 'edit-toggle edit-close row'});
	      		this.lblToggle.text('save');
	      		this.name.focus();
    		} else {
    			//close
		    	address = this.address.val();
		    	console.log(address);
	    		this.me = me;
	    		var _this = this;
		    	if (address) {
	    			this.geocoder = new google.maps.Geocoder();
			    	geocoder.geocode({ 'address': address}, function(result, status) { 
			    		_this.geoSuccess.call(_this, result, status);
			   		});
		    	} else {
		    		_this.lblToggle.text('edit');
		    		_this.imgToggle.attr({'class': 'toggle plus', 'src': 'static/img/plus.png'});
		    		_this.me.attr({'class': 'edit-toggle edit-open row'});
		    		_this.$el.removeClass("editing");
		 	}
    		}
	},
	geoSuccess: function(results, status) { 
		if (status == google.maps.GeocoderStatus.OK) {
			if (results.length > 1) {
				var ul = document.createElement('ul');
				ul.className = 'unstyled';
				for (var i in results) {
    					var li = document.createElement('li');
    					var lbl = document.createElement('label');
    					var radio = document.createElement('input');
    					lbl.className = 'radio';
    					radio.type = 'radio';
    					radio.name = 'locationRadios';
    					radio.value = results[i].formatted_address;
    					lbl.appendChild(radio);
    					lbl.innerHTML += results[i].formatted_address;
    					li.appendChild(lbl);
					ul.appendChild(li);
    				}
	    			this.form = $("<form></form>");
	    			this.form.append(ul);
	    			var _this = this;
	    			bootbox.alert(this.form, function() {_this.multipleLocations.call(_this);});
	    			return;
			}
			map.setCenter(results[0].geometry.location);
			var marker = new google.maps.Marker({
				map: map,
				position: results[0].geometry.location,
				labelContent: this.name.val()
    			});
    			this.model.save({
    				lat: results[0].geometry.location.jb, 
    				lng: results[0].geometry.location.kb, 
    				name: this.name.val(), 
    				address: results[0].formatted_address},{
    				error: function(e) {
			    		$('#modal-error').modal('show');
    					return;
    				}
    			});
		      	this.lblToggle.text('edit');
	    		this.imgToggle.attr({'class': 'toggle plus', 'src': 'static/img/plus.png'});
	    		this.me.attr({'class': 'edit-toggle edit-open row'});
	    		this.$el.removeClass("editing");
    		} else {
    			divModMsg.innerHTML = 'Could not find location :\'(. Did not save.';
    			divModMsg.className = "alert alert-error";
			bootbox.dialog(divModMsg.outerHTML, {
			    "label" : "Continue",	
			    "class" : "btn-danger",
			});
    		}
	},
	multipleLocations: function() {
		this.address.val($("form input:checked").val());
	},
    	save: function(e) {
    		var _this = this;
    		this.me = this.$el.children().children('.edit-toggle');
    		address = this.address.val();
		this.geocoder = new google.maps.Geocoder();
    		geocoder.geocode({ 'address': address}, function(result, status) { 
    			_this.geoSuccess.call(_this, result, status);
   		});
    	},
    	delete: function() {
    		this.model.url = APIBASE+'/location/'+this.model.id;
    		this.model.destroy();
    	},
    	goto: function() {
    		goToMarker(this.model.attributes, map);
    	},
    	clear: function() {
 			this.model.destroy();
		}
	});

	var LocationListView = Backbone.View.extend({
		el: $("#container"),
		events: {
			'click #add-location': 'createLocation'
		},
		initialize: function() {
			this.listenTo(locationList, 'add', this.addOne);
			this.listenTo(locationList, 'reset', this.addAll);
			this.listenTo(locationList, 'all', this.render);
			this.locList = $('#location-list');
			locationList.fetch({reset: true});
		},
		render: function() {},
		createLocation: function() {
			locationList.create({lat: 0, lng: 0, name: 'New Location', address: ''},
								{url: APIBASE+'/location'});
		},
	    	addOne: function(location) {
			addMarker(location.attributes, map);
			var view = new LocationView({model: location});
			console.log('hit');
			this.locList.append(view.render().el);
		},
		addAll: function() {
  			locationList.each(this.addOne, this);
		}
	});

	var LocationListView = new LocationListView;
});

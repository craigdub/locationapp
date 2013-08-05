from flask import Flask, request, redirect, url_for, abort, render_template
from flask.ext.sqlalchemy import SQLAlchemy
from flask.ext import restful
from flask import jsonify
from geopy import geocoders
import json
import logging
import os

app = Flask(__name__, static_folder='static')
app.config.from_object(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql://root:root@127.0.0.1/uber'

db = SQLAlchemy(app)
api = restful.Api(app)

logger = logging.getLogger('')
logging.basicConfig(filename=os.environ['V_HOME'] + '../logs/locationapp.log', level=logging.INFO)

#model
class Location(db.Model):
	__tablename__ = 'location'

	id = db.Column(db.Integer, primary_key=True, autoincrement=True)
	lat = db.Column(db.Float, nullable = False)	
	lng = db.Column(db.Float, nullable = False)		
	address = db.Column(db.String(100), nullable = False)
	name = db.Column(db.String(50), nullable = False)

	def __init__(self, lat, lng, address, name):
		self.lat = lat
		self.lng = lng
		self.address = address
		self.name = name

	def __repr__(self):
		return "<User('%d', '%d','%d', '%s', '%s')>" % (self.id, self.lat, self.lng, self.address, self.name)

	def as_dict(self):
		"""Returns dict representation of location
		"""
		return {
			'lat': self.lat,
			'lng': self.lng,
			'id': int(self.id),
			'address': self.address,
			'name': self.name
		}

#view
@app.route("/")
def index():
	g = geocoders.GoogleV3()
	try:
		#default map location
		url = 'http://api.hostip.info/get_html.php?ip=' + request.remote_addr + '&position=true'
		response = urllib.urlopen().read(url)
		m = re.search(r'City:\s(.*)', response)
		p = m.group(0).split(': ')
		city = p[1]
		if (not city):
			#default to sf for the scope of this challenge
			city = "Union Square San Fransisco, CA 94102"
		place, (lat, lng) = g.geocode(ciddty)
	except Exception as e:
		print logger.error(e)
	return render_template('layout.html', place=place, lat=lat, lng=lng)

#rest api
API_PREFIX = '/api/v1.0'

class APILocations(restful.Resource):
	def get(self):
		"""Get locations 
		"""
		results = []
		try:
			locations = db.session.query(Location).all()
			for loc in locations:
				results.append(loc.as_dict())
		except Exception as e:
			logger.error(e)
			return jsonify({'error': str(e), 'type': 'Exception'})
		return results

	def put(self):
		"""Add location
		"""
		if not request.data:
			print abort(404)
		result = 0
		try:
			data = json.loads(request.data)
			location = Location(data['lat'], data['lng'], data['address'], data['name'])
			result = db.session.add(location)
			db.session.commit()
			if result == 0:
				abort(404)	
		except Exception as e:
			logger.error(e)
			return jsonify({'error': str(e), 'type': 'Exception'})
		return jsonify(location.as_dict())

class APILocation(restful.Resource):
	def get(self, id):
		"""Get a location
		"""
		try:
			location = db.session.query(location).filter_by(id=id).first()
			if location == none:
				abort(404)
		except Exception as e:
			logger.error(e)
			return jsonify({'error': e, 'type': 'Exception'})
		return jsonify(location.as_dict())

	def put(self, id):
		"""Update a location
		"""
		if not request.data:
			abort(404)
		data = json.loads(request.data)
		try:
			result = db.session.query(Location).filter_by(id=id).update(data)
			if result == 0:
				abort(404)
			db.session.commit()
		except Exception as e:
			logger.error(e)
			return jsonify({'error': e, 'type': 'Exception'})
		return jsonify(data)

	def delete(self, id):
		"""Delete a location
		"""
		location = db.session.query(Location).filter_by(id=id).first()
		if location == None:
			abort(404)
		result = db.session.delete(location)
		db.session.commit()
		return jsonify(location.as_dict())	

api.add_resource(APILocation, API_PREFIX + '/location/<int:id>')
api.add_resource(APILocations, API_PREFIX + '/location')

if __name__ == '__main__':
	app.run(port=8080, host='0.0.0.0')

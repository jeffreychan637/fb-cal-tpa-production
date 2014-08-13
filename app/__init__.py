"""This file defines the Flask server that this app runs on."""

from os import environ
from flask import Flask

__author__ = "Jeffrey Chan"

class MyFlask(Flask):
    """This is a class based on the Flask class. The only difference is that
    in this class all the front end files are not cached. This is highly useful
    when developing but this should not be used on the production server where
    just the Flask class works great.
    """
    def get_send_file_max_age(self, name):
        if name.lower().endswith('.js'):
            return 0
        elif name.lower().endswith('.css'):
            return 0
        elif name.lower().endswith('.html'):
            return 0
        return Flask.get_send_file_max_age(self, name)

if "HEROKU" in environ:
    flask_app = Flask(__name__, static_folder="client", 
                                template_folder="client")
else:
    flask_app = MyFlask(__name__, static_folder="client", 
                                  template_folder="client")

"""These imports allow the Flask app to work. It allows us to start the server
in this file where we can see the "client" directory rather than in the server
directory where we have complications seeing our frontend files. 
"""
from app.server import views
from app.server import controllers

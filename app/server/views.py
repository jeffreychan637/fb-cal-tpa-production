"""All files served on the server are handled here.

For the index (widget) and settings files, it simply serves the files as is
because they rely on Angular JS - and Underscore JS for the calendar - to do the
rendering on the client side. While the same is true for the modal, the server
actually renders it as a template in order to pass the event ID into the modal.
This allows the Angular JS code to know what event they will request to provide
data for later.
"""

from flask import send_file, render_template
from app import flask_app

__author__ = "Jeffrey Chan"

@flask_app.route('/')
def index():
    """Serves the HTML file for the Widget"""
    return send_file('client/index.html')

@flask_app.route('/settings/')
def settings():
    """Serves the HTML file for the Settings Panel"""
    return send_file('client/settings.html')

@flask_app.route('/modal/<int:event_id>/')
def modal(event_id):
    """Serves the HTML file for the modal, passing the event_id as a variable"""
    return render_template('modal.html', event_id = event_id);
#!/usr/bin/env python
"""Running this file starts the Flask server"""

from os import walk, path, environ
from app import flask_app

__author__ = "Jeffrey Chan"

"""This goes through all the files in client and adds them a list called
extra_files. Passed into the run function, the server knows to watch all
the files in the client folder for changes. This is extremely useful when
developing the app, but should be removed when the app is in production.
"""
if "HEROKU" not in environ:
    extra_dirs = ['app/client']
    extra_files = extra_dirs[:]
    for extra_dir in extra_dirs:
        for dirname, dirs, files in walk(extra_dir):
            if 'bower_components' in dirs:
                dirs.remove('bower_components')
            for filename in files:
                filename = path.join(dirname, filename)
                if path.isfile(filename):
                    extra_files.append(filename)

"""This starts the Flask server"""
if "HEROKU" in environ:
    port = int(environ.get('PORT', 5000))
    flask_app.run(host='0.0.0.0', port=port)
else:
    flask_app.run(debug=True, extra_files=extra_files)
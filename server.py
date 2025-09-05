#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache') 
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        sys.stdout.write(f"{self.log_date_time_string()} - {format%args}\n")
        sys.stdout.flush()

if __name__ == "__main__":
    port = 8000
    os.chdir('/home/user/webapp')
    
    with socketserver.TCPServer(("", port), CustomHandler) as httpd:
        print(f"Server running at http://localhost:{port}")
        sys.stdout.flush()
        httpd.serve_forever()

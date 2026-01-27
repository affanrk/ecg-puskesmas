from sqlalchemy.orm import Session
from .reader import SessionReader
from .writer import SessionWriter
from .stats import SessionStatsProcessor

class SessionRepository:
    def __init__(self, db: Session):
        self.db = db
        self.reader = SessionReader(db)
        self.writer = SessionWriter(db)
        self.stats = SessionStatsProcessor(db)

    # Delegate methods to components
    
    def get_classification_stats(self, user_id=None):
        return self.stats.get_classification_stats(user_id)

    def find_by_recording_id(self, recording_id):
        return self.reader.find_by_recording_id(recording_id)
        
    def find_by_recording_id_or_fail(self, recording_id):
        return self.reader.find_by_recording_id_or_fail(recording_id)
        
    def list_by_device(self, device_id, limit=100):
        return self.reader.list_by_device(device_id, limit)
        
    def list_by_user(self, user_id, limit=100):
        return self.reader.list_by_user(user_id, limit)
        
    def get_recent_sessions(self, user_id, limit):
        return self.reader.get_recent_sessions(user_id, limit)

    def search_sessions(self, *args, **kwargs):
        return self.reader.search_sessions(*args, **kwargs)

    def create_session(self, *args, **kwargs):
        return self.writer.create_session(*args, **kwargs)
        
    def update_analysis_results(self, *args, **kwargs):
        return self.writer.update_analysis_results(*args, **kwargs)
            
    def delete_zombie_sessions(self):
        return self.writer.delete_zombie_sessions()
        
    def delete_by(self, **kwargs):
        return self.writer.delete_by(**kwargs)
        
    def delete(self, id):
        return self.writer.delete(id)
        
    # Expose find/get for direct access if needed, delegating to reader
    def get(self, id):
        return self.reader.get(id)

import os
import json
import sys
from typing import List
from database import Task
from sqlalchemy.orm import Session
import nltk
from nltk.corpus import stopwords

# Add AI_agent to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'AI_agent'))

# Import the agent
try:
    from AI_agent.Llama_AI_agent import MalariaResearchAgent
except ImportError:
    try:
        sys.path.append('./AI_agent')
        from Llama_AI_agent import MalariaResearchAgent
    except ImportError:
        print("Could not import MalariaResearchAgent")
        MalariaResearchAgent = None

class LlamaChatService:
    def __init__(self):
        # Setup NLTK
        try:
            self.stop_words = set(stopwords.words('english'))
        except LookupError:
            nltk.download('stopwords')
            self.stop_words = set(stopwords.words('english'))
        
        # Initialize Llama agent
        self.agents = {}  # Store agents per task

    def get_or_create_agent(self, task_id: str, clinical_data: dict):
        """Get existing agent or create new one for this task"""
        if task_id not in self.agents:
            try:
                if not MalariaResearchAgent:
                    print("MalariaResearchAgent not available")
                    return None
                    
                agent = MalariaResearchAgent()
                # Set clinical data
                if clinical_data:
                    agent.set_patient_data(clinical_data)
                self.agents[task_id] = agent
                print(f"Created new agent for task {task_id}")
            except Exception as e:
                print(f"Failed to create agent: {e}")
                return None
        return self.agents[task_id]

    def get_patient_data_from_results(self, results: dict) -> dict:
        """Convert task results to clinical data format - NO IDENTIFIERS"""
        try:
            print(f"Converting results to clinical data: {results}")
            
            # Extract ONLY clinical data needed for medical analysis
            clinical_data = {
                "parasitemia_count": 1000,  # Default
                "parasite_density": "N/A",
                "total_rbcs": 0,
                "stage_counts": {},
                "species_detected": "P. falciparum"
            }
            
            # Try to extract parasitemia count from different fields
            if 'average_parasite_density_per_1000_rbc' in results:
                try:
                    density = float(results['average_parasite_density_per_1000_rbc'])
                    # Estimate total parasites (assuming average 4M RBCs/μL)
                    estimated_count = (density) * 4000
                    clinical_data["parasitemia_count"] = int(estimated_count)
                    clinical_data["parasite_density"] = f"{density} parasites/μL"
                    print(f"Extracted parasitemia from density: {estimated_count}")
                except Exception as e:
                    print(f"Error extracting from density: {e}")
            
            if 'average_parasitemia_percent' in results:
                try:
                    percent = float(results['average_parasitemia_percent'])
                    # Convert percentage to parasites/μL (assuming 5M RBCs/μL)
                    estimated_count = (percent / 100) * 5000000
                    clinical_data["parasitemia_count"] = int(estimated_count)
                    clinical_data["parasite_density"] = f"{percent}%"
                    print(f"Extracted parasitemia from percentage: {estimated_count}")
                except Exception as e:
                    print(f"Error extracting from percentage: {e}")
            
            # Extract stage counts
            if 'average_stage_counts' in results:
                clinical_data["stage_counts"] = results['average_stage_counts']
            elif 'stage_counts' in results:
                clinical_data["stage_counts"] = results['stage_counts']
            
            # Extract other fields
            if 'total_parasites' in results:
                clinical_data["parasitemia_count"] = int(results['total_parasites'])
            
            if 'total_rbcs' in results:
                clinical_data["total_rbcs"] = int(results['total_rbcs'])
            
            print(f"Final clinical data: {clinical_data}")
            return clinical_data
            
        except Exception as e:
            print(f"Error converting results: {e}")
            return {
                "parasitemia_count": 1000,
                "parasite_density": "Unknown",
                "species_detected": "P. falciparum"
            }

    def format_chat_history_as_context(self, history: List[dict]) -> str:
        """Format entire chat history as context string"""
        if not history:
            return ""
        
        context_parts = ["Previous conversation context:"]
        for i, qa in enumerate(history, 1):
            context_parts.append(f"Q{i}: {qa.get('user', '')}")
            context_parts.append(f"A{i}: {qa.get('assistant', '')}")
        
        return "\n".join(context_parts)

    def update_chat_history(self, task: Task, user_msg: str, ai_msg: str, db: Session):
        """Update chat history - FULL HISTORY ONLY"""
        try:
            # Get existing history
            history = json.loads(task.last_chat_history) if task.last_chat_history else []
            
            # Add new Q&A pair
            history.append({"user": user_msg, "assistant": ai_msg})
            
            # Keep last 15 conversations
            if len(history) > 15:
                history = history[-15:]
            
            # Save updated history
            task.last_chat_history = json.dumps(history)
            db.commit()
            
        except Exception as e:
            print(f"Error updating chat history: {e}")

    async def generate_comprehensive_report(self, task_id: str, user_id: str, db: Session) -> str:
        """Generate comprehensive medical report using Llama agent's generate_report() method"""
        if not MalariaResearchAgent:
            return "Llama service not available. Please check AI agent configuration."
            
        try:
            print(f"Generating report for task {task_id}")
            
            task = db.query(Task).filter(Task.id == task_id, Task.user_id == user_id).first()
            if not task:
                raise Exception("Task not found")
            if not task.result:
                raise Exception("No analysis results available")
            
            # Get task results and convert to clinical data ONLY
            results = json.loads(task.result)
            clinical_data = self.get_patient_data_from_results(results)
            
            # Get or create agent for this task
            agent = self.get_or_create_agent(task_id, clinical_data)
            if not agent:
                raise Exception("Failed to initialize AI agent")
            
            print(f"Generating report with clinical data: {clinical_data}")
            
            # Use the agent's built-in generate_report() method
            report = agent.generate_report()
            
            print(f"Report generated successfully, length: {len(report)} chars")
            return report
            
        except Exception as e:
            error_msg = f"Report generation failed: {str(e)}"
            print(error_msg)
            return f"{error_msg}. Please use the chat feature for analysis."

    async def chat(self, task_id: str, user_id: str, user_message: str, db: Session) -> str:
        """Main chat function using Llama agent with full history context"""
        if not MalariaResearchAgent:
            return "Llama service not available. Please check AI agent configuration."
            
        try:
            task = db.query(Task).filter(Task.id == task_id, Task.user_id == user_id).first()
            if not task:
                raise Exception("Task not found")
            if not task.result:
                raise Exception("No analysis results available for this task")
            
            print(f"Processing chat for task {task_id}: {user_message}")
            
            # Get task results and convert to clinical data
            results = json.loads(task.result)
            clinical_data = self.get_patient_data_from_results(results)
            
            # Get or create agent for this task
            agent = self.get_or_create_agent(task_id, clinical_data)
            if not agent:
                raise Exception("Failed to initialize AI agent")
            
            # ✅ UPDATED: Get full chat history as context (no TLDRs)
            history = json.loads(task.last_chat_history) if task.last_chat_history else []
            context = self.format_chat_history_as_context(history)
            
            # Combine context with current user message
            if context:
                enhanced_message = f"{context}\n\nCurrent question: {user_message}"
            else:
                enhanced_message = user_message
            
            print(f"Sending to agent: {enhanced_message[:200]}...")
            
            # Use the agent's ask_question() method
            response = agent.ask_question(enhanced_message)
            
            print(f"Agent response received: {len(response)} chars")
            
            # ✅ SIMPLIFIED: Update chat history (no TLDRs)
            self.update_chat_history(task, user_message, response, db)
            
            return response
            
        except Exception as e:
            error_msg = f"Chat error: {str(e)}"
            print(error_msg)
            return f"Sorry, I encountered an error: {str(e)}. Please try again."

# Global instance
llama_service = LlamaChatService()
# enhanced_malaria_agent_fixed.py

from langchain_google_vertexai import ChatVertexAI
from langchain_community.tools import Tool
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage, ToolMessage
from langchain_core.runnables import RunnableLambda
import requests
import os
import json
from typing import List, Dict, Any, Tuple, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# -----------------------------
# Vertex AI LLaMA Chat Model
# -----------------------------
llm = ChatVertexAI(
    model_name="llama-4-scout-17b-16e-instruct-maas",
    temperature=0.7,
    project="project-theia-461422",
    location="us-east5"
)

# ----------------------------------
# Tool Functions (keep existing code)
# ----------------------------------
def search_pubmed(query: str) -> str:
    """Search PubMed for medical research articles."""
    base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    params = {
        "db": "pubmed",
        "term": query,
        "retmax": 3,
        "retmode": "json"
    }
    
    try:
        response = requests.get(base_url, params=params)
        response.raise_for_status()
        data = response.json()
        ids = data.get("esearchresult", {}).get("idlist", [])
        
        if not ids:
            return f"No PubMed articles found for '{query}'."
        
        # Fetch abstracts for the found IDs
        abstracts = []
        for pmid in ids[:3]:
            abstract = fetch_pubmed_abstract(pmid)
            abstracts.append(f"PMID: {pmid}\n{abstract}\n")
        
        return f"Top PubMed results for '{query}':\n\n" + "\n".join(abstracts)
        
    except Exception as e:
        return f"PubMed search error: {e}"

def fetch_pubmed_abstract(pmid: str) -> str:
    """Fetch abstract for a specific PubMed ID."""
    try:
        base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
        params = {
            "db": "pubmed",
            "id": pmid,
            "retmode": "xml"
        }
        response = requests.get(base_url, params=params)
        response.raise_for_status()
        
        content = response.text
        if "<ArticleTitle>" in content and "</ArticleTitle>" in content:
            title_start = content.find("<ArticleTitle>") + len("<ArticleTitle>")
            title_end = content.find("</ArticleTitle>")
            title = content[title_start:title_end]
        else:
            title = "Title not available"
            
        if "<AbstractText>" in content and "</AbstractText>" in content:
            abstract_start = content.find("<AbstractText>") + len("<AbstractText>")
            abstract_end = content.find("</AbstractText>")
            abstract = content[abstract_start:abstract_end]
        else:
            abstract = "Abstract not available"
            
        return f"Title: {title}\nAbstract: {abstract}"
        
    except Exception as e:
        return f"Could not fetch abstract for PMID {pmid}: {e}"

def query_who_protocols(query: str) -> str:
    """Search WHO malaria protocols and guidelines."""
    who_guidelines = {
        "parasitemia_thresholds": {
            "low": "< 1,000 parasites/μL - Monitor closely, consider outpatient treatment",
            "moderate": "1,000-10,000 parasites/μL - Consider hospitalization, close monitoring",
            "high": "10,000-100,000 parasites/μL - Severe malaria risk, immediate treatment required",
            "very_high": "> 100,000 parasites/μL - Critical, intensive care consideration"
        },
        "microscopy_protocols": {
            "quality_control": "WHO microscopy quality control: (1) Regular proficiency testing with known samples, (2) Minimum 100 high-power fields examination before declaring negative, (3) Inter-observer agreement >90%, (4) Daily positive and negative controls, (5) Regular equipment calibration and maintenance, (6) Standardized staining procedures, (7) Systematic slide examination pattern",
            "thick_film": "Thick blood films: Primary method for parasite detection. Examine minimum 100 high-power fields. Sensitivity: 50-100 parasites/μL",
            "thin_film": "Thin blood films: Species identification and parasitemia quantification. Count parasites per 1000 RBCs or calculate parasites/μL",
            "staining": "Giemsa staining protocol: Fix thin films with methanol, stain with 3% Giemsa for 45-60 minutes, pH 7.2"
        },
        "treatment_protocols": {
            "uncomplicated_falciparum": "WHO recommended ACT: Artemether-lumefantrine (20/120mg) twice daily for 3 days, or Artesunate-amodiaquine (100/270mg) daily for 3 days",
            "severe_malaria": "IV Artesunate: 2.4mg/kg at 0, 12, 24 hours, then daily. Monitor for delayed hemolysis. Follow-up for 4 weeks",
            "vivax_ovale": "Chloroquine 25mg/kg over 3 days PLUS Primaquine 0.25-0.5mg/kg daily for 14 days (after G6PD testing)",
            "resistance_management": "Monitor ACT efficacy, use multiple first-line ACTs, avoid artemisinin monotherapy"
        },
        "complications": {
            "cerebral_malaria": "Glasgow Coma Score <11, exclude hypoglycemia and other causes. Immediate IV artesunate required",
            "severe_anemia": "Hemoglobin <5g/dL or Hematocrit <15%. Consider blood transfusion",
            "respiratory_distress": "Acidotic breathing, ARDS. Mechanical ventilation may be required",
            "renal_failure": "Creatinine >265μmol/L. Dialysis consideration for severe cases",
            "hypoglycemia": "Blood glucose <2.2mmol/L. Immediate correction with IV glucose"
        }
    }
    
    query_lower = query.lower()
    results = []
    
    # Search through all guidelines
    for category, items in who_guidelines.items():
        if isinstance(items, dict):
            for key, value in items.items():
                # Check if query terms match category, key, or content
                search_text = f"{category} {key} {value}".lower()
                query_terms = query_lower.split()
                
                if any(term in search_text for term in query_terms) or any(term in query_lower for term in key.split('_')):
                    results.append(f"**WHO {category.replace('_', ' ').title()} - {key.replace('_', ' ').title()}:**\n{value}")
    
    if results:
        return f"WHO Guidelines for '{query}':\n\n" + "\n\n".join(results[:5])
    else:
        return f"No specific WHO guidelines found for '{query}'. Please try more specific terms like 'quality control', 'treatment', 'microscopy', or 'complications'."

# ----------------------------------
# Initialize Tools
# ----------------------------------
pubmed_tool = Tool(
    name="pubmed_search",
    func=search_pubmed,
    description="Search PubMed for medical research articles on malaria, treatments, diagnostics, and complications."
)

who_tool = Tool(
    name="who_protocols",
    func=query_who_protocols,
    description="Query WHO malaria treatment protocols, microscopy guidelines, and diagnostic criteria."
)

tools = [pubmed_tool, who_tool]
tool_map = {tool.name: tool for tool in tools}

# ----------------------------------------------------
# Enhanced Agent - NO INITIALIZATION REQUIRED
# ----------------------------------------------------
class MalariaResearchAgent:
    """Enhanced Malaria Research Agent - Direct question answering."""
    
    def __init__(self):
        self.conversation_history = []
        self.patient_data = None
    
    def set_patient_data(self, patient_data: Dict[str, Any]) -> None:
        """Set patient data (optional - for context)."""
        try:
            self.patient_data = self._validate_patient_data(patient_data)
        except:
            # If validation fails, store raw data
            self.patient_data = patient_data
    
    def ask_question(self, question: str) -> str:
        """Process any question directly - NO INITIALIZATION REQUIRED."""
        return self._process_query(question, is_initial=False)
    
    def ask_followup(self, question: str) -> str:
        """Alias for ask_question - for backward compatibility."""
        return self.ask_question(question)
    
    def generate_report(self) -> str:
        """Generate comprehensive report (formerly initialize)."""
        if not self.patient_data:
            return "No patient data available for report generation. Please set patient data first."
        
        report_query = """Please provide a comprehensive malaria diagnostic report. Include:
        1. Parasitemia level analysis according to WHO criteria
        2. Risk assessment and severity classification  
        3. Recommended immediate actions
        4. Treatment recommendations
        5. Additional diagnostic considerations
        6. Monitoring requirements"""
        
        return self._process_query(report_query, is_initial=True)
    
    def _process_query(self, query: str, is_initial: bool = False) -> str:
        """Process a query with proper tool calling."""
        
        # Create system prompt
        system_prompt = self._create_system_prompt(is_initial)
        
        # Add query to conversation
        self.conversation_history.append({"role": "user", "content": query})
        
        # Prepare messages for LLM
        messages = [SystemMessage(content=system_prompt)]
        
        # Add conversation history
        for msg in self.conversation_history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            else:
                messages.append(AIMessage(content=msg["content"]))
        
        try:
            # Get initial response from LLM
            response = llm.invoke(messages)
            response_content = response.content
            
            # Check if response contains tool calls
            if self._needs_tool_call(response_content, query):
                # Determine which tools to call
                tool_calls = self._identify_tool_calls(query, response_content)
                
                # Execute tools and get enhanced response
                enhanced_response = self._execute_tools_and_respond(messages, tool_calls, query)
                final_response = enhanced_response
            else:
                final_response = response_content
            
            # Add response to conversation history
            self.conversation_history.append({"role": "assistant", "content": final_response})
            
            return final_response
            
        except Exception as e:
            error_msg = f"Error processing query: {str(e)}"
            self.conversation_history.append({"role": "assistant", "content": error_msg})
            return error_msg
    
    def _needs_tool_call(self, response: str, query: str) -> bool:
        """Determine if we need to call tools based on the query."""
        tool_indicators = [
            "pubmed", "research", "studies", "literature", "recent", "evidence",
            "who", "protocol", "guideline", "recommendation", "treatment", "quality control",
            "microscopy", "diagnostic", "standard"
        ]
        
        query_lower = query.lower()
        return any(indicator in query_lower for indicator in tool_indicators)
    
    def _identify_tool_calls(self, query: str, response: str) -> List[Dict[str, str]]:
        """Identify which tools to call based on the query."""
        tools_to_call = []
        query_lower = query.lower()
        
        # Check for WHO protocol needs
        who_indicators = ["who", "protocol", "guideline", "quality control", "microscopy", "treatment", "standard"]
        if any(indicator in query_lower for indicator in who_indicators):
            tools_to_call.append({"tool": "who_protocols", "query": query})
        
        # Check for PubMed research needs
        pubmed_indicators = ["research", "studies", "recent", "literature", "evidence", "pubmed"]
        if any(indicator in query_lower for indicator in pubmed_indicators):
            tools_to_call.append({"tool": "pubmed_search", "query": query})
        
        # If no specific tool identified but seems to need external info, use both
        if not tools_to_call and self._needs_tool_call(response, query):
            tools_to_call.append({"tool": "who_protocols", "query": query})
        
        return tools_to_call
    
    def _execute_tools_and_respond(self, messages: List[BaseMessage], tool_calls: List[Dict], original_query: str) -> str:
        """Execute tools and generate enhanced response."""
        tool_results = []
        
        # Execute each tool call
        for tool_call in tool_calls:
            tool_name = tool_call["tool"]
            tool_query = tool_call["query"]
            
            if tool_name in tool_map:
                try:
                    result = tool_map[tool_name].func(tool_query)
                    tool_results.append(f"**{tool_name.replace('_', ' ').title()} Results:**\n{result}")
                except Exception as e:
                    tool_results.append(f"**{tool_name} Error:** {str(e)}")
        
        # Combine tool results
        combined_results = "\n\n".join(tool_results)
        
        # Create enhanced prompt with tool results
        enhanced_prompt = f"""Based on the following information sources, please provide a comprehensive answer to the user's question: "{original_query}"

**Available Information:**
{combined_results}

Please synthesize this information to provide a clear, evidence-based response. Cite specific sources when referencing WHO guidelines or research studies."""
        
        # Add enhanced prompt to messages
        messages.append(HumanMessage(content=enhanced_prompt))
        
        # Get final response
        try:
            final_response = llm.invoke(messages)
            return final_response.content
        except Exception as e:
            return f"Error generating enhanced response: {str(e)}\n\nDirect tool results:\n{combined_results}"
    
    def _create_system_prompt(self, is_initial: bool) -> str:
        """Create system prompt based on context."""
        base_prompt = f"""You are an expert malaria diagnostics and treatment assistant.

PATIENT DATA:
{json.dumps(self.patient_data, indent=2) if self.patient_data else "No patient data available - answer based on general medical knowledge"}

CAPABILITIES:
- Access to WHO malaria protocols and guidelines
- Access to current medical research via PubMed
- Expert knowledge in malaria diagnostics and treatment

INSTRUCTIONS:
- Give CONCISE, EVIDENCE-BASED answers, NOT TOO LONG!!!!
- DO NOT CREATE A PATIENT INFORMATION SECTION!!
- Provide evidence-based medical insights
- Reference WHO guidelines and research ONLY when applicable
- Consider patient demographics and clinical context when available
- Emphasize need for professional medical consultation
- Be clear about severity levels and urgency
- Answer questions directly and comprehensively"""

        if is_initial and self.patient_data:
            # Add parasitemia analysis for reports
            if 'parasitemia_count' in self.patient_data:
                try:
                    count = int(self.patient_data['parasitemia_count'])
                    analysis = self._analyze_parasitemia(count)
                    base_prompt += f"""

PARASITEMIA ANALYSIS:
Count: {count}/μL
Severity: {analysis['severity']}
Risk Level: {analysis['risk']}
WHO Recommendation: {analysis['recommendation']}"""
                except:
                    pass

        return base_prompt
    
    def _analyze_parasitemia(self, count: int) -> Dict[str, str]:
        """Analyze parasitemia levels according to WHO criteria."""
        if count < 1000:
            return {"severity": "Low", "risk": "Minimal", "recommendation": "Monitor, consider outpatient treatment"}
        elif count < 10000:
            return {"severity": "Moderate", "risk": "Moderate", "recommendation": "Close monitoring, possible hospitalization"}
        elif count < 100000:
            return {"severity": "High", "risk": "Severe malaria risk", "recommendation": "Immediate treatment, hospitalization required"}
        else:
            return {"severity": "Very High", "risk": "Critical", "recommendation": "Emergency treatment, intensive care consideration"}
    
    def _validate_patient_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and structure patient data."""
        if 'parasitemia_count' not in data:
            raise ValueError("Missing required field: parasitemia_count")
        
        try:
            data['parasitemia_count'] = int(data['parasitemia_count'])
        except (ValueError, TypeError):
            raise ValueError("parasitemia_count must be a number")
        
        return data

# ----------------------------------------------------
# Simple Function Interface
# ----------------------------------------------------
def create_malaria_agent(patient_data: Dict[str, Any] = None) -> Tuple[callable, callable]:
    """
    Simple function to create a malaria research agent.
    
    Args:
        patient_data: Optional dictionary containing patient information
        
    Returns:
        Tuple of (chat_function, report_function)
    """
    agent = MalariaResearchAgent()
    if patient_data:
        agent.set_patient_data(patient_data)
    
    def chat(question: str) -> str:
        return agent.ask_question(question)
    
    def generate_report() -> str:
        return agent.generate_report()
    
    return chat, generate_report

# ----------------------------------------------------
# Example Usage
# ----------------------------------------------------
if __name__ == "__main__":
    print("=== Creating Malaria Research Agent ===")
    
    # Create agent without initialization
    agent = MalariaResearchAgent()
    
    print("\n=== DIRECT QUESTIONS (No initialization needed) ===")
    
    # Direct questions without patient data
    questions = [
        "What are the WHO quality control standards for malaria microscopy?",
        "What does a parasite count of 15000 per microliter indicate?", 
        "What are the current treatment protocols for severe malaria?",
        "Are there recent studies on artemisinin resistance?"
    ]
    
    for i, question in enumerate(questions, 1):
        print(f"\n--- Question {i} ---")
        print(f"Q: {question}")
        response = agent.ask_question(question)
        print(f"A: {response}")
    
    print("\n=== SETTING PATIENT DATA AND GENERATING REPORT ===")
    
    # Set patient data
    patient_data = {
        "parasitemia_count": 15000,
        "species_detected": "P. falciparum",
        "symptoms": ["fever", "chills", "headache"]
    }
    
    agent.set_patient_data(patient_data)
    
    # Generate comprehensive report
    report = agent.generate_report()
    print("\n=== COMPREHENSIVE REPORT ===")
    print(report)
    
    print("\n=== SESSION COMPLETE ===")
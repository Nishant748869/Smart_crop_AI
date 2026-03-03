from fpdf import FPDF
import os

class PDF(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 15)
        self.cell(0, 10, 'Internship Project Report', 0, 1, 'C')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

def create_report():
    pdf = PDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Title
    pdf.set_font('Arial', 'B', 18)
    pdf.cell(0, 10, 'Smart Crop Punjab', 0, 1, 'C')
    
    pdf.set_font('Arial', 'I', 12)
    pdf.cell(0, 10, 'Prepared by: Nishant Kumar', 0, 1, 'C')
    pdf.cell(0, 10, 'chicmic studios,mohali', 0, 1, 'C')
    pdf.ln(10)
    
    # Description
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, '1. Project Description', 0, 1)
    pdf.set_font('Arial', '', 11)
    desc = ("Smart Crop Punjab is a full-stack, automated agricultural advisory engine. "
            "It is designed to help Indian farmers optimize irrigation and diagnose crop health. "
            "The system calculates precise, real-time Evapotranspiration (ET) metrics based on live satellite data and weather APIs, "
            "and also features a 3-Layer Crop Health Validation Engine to cross-validate AI vision model diagnoses with environmental risk factors.")
    pdf.multi_cell(0, 6, desc)
    pdf.ln(5)
    
    # Link
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, '2. Project Link', 0, 1)
    pdf.set_font('Arial', '', 11)
    pdf.cell(0, 6, 'GitHub / Live Repository: [Available Upon Request]', 0, 1)
    pdf.ln(5)
    
    # Tech Stack
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, '3. Tech Stack', 0, 1)
    
    pdf.set_font('Arial', 'B', 11)
    pdf.cell(30, 6, 'Frontend:', 0, 0)
    pdf.set_font('Arial', '', 11)
    pdf.cell(0, 6, 'Vanilla JavaScript, HTML5, Vanilla CSS (Glassmorphism UI)', 0, 1)
    
    pdf.set_font('Arial', 'B', 11)
    pdf.cell(30, 6, 'Backend:', 0, 0)
    pdf.set_font('Arial', '', 11)
    pdf.cell(0, 6, 'Python 3.10+, FastAPI (Asynchronous, High-Performance)', 0, 1)
    
    pdf.set_font('Arial', 'B', 11)
    pdf.cell(30, 6, 'Database:', 0, 0)
    pdf.set_font('Arial', '', 11)
    pdf.cell(0, 6, 'SQLite via SQLAlchemy ORM (Strict Pydantic Validation)', 0, 1)
    
    pdf.set_font('Arial', 'B', 11)
    pdf.cell(30, 6, 'Scheduling:', 0, 0)
    pdf.set_font('Arial', '', 11)
    pdf.cell(0, 6, 'APScheduler (Background Midnight Cron Jobs for daily updates)', 0, 1)
    pdf.ln(5)
    
    # Keywords
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, '4. Key Technologies & Resume Keywords', 0, 1)
    pdf.set_font('Arial', 'I', 11)
    keywords = ("FastAPI, Asynchronous Processing, Machine Learning / Computer Vision, ResNet50 / InceptionV3, "
                "CNN Inference, Open-Meteo REST API, ISRIC SoilGrids API, NDVI Satellite Spatial Stress, "
                "Penman-Monteith ET0 Algorithm, APScheduler Background Task Runner, SQLAlchemy ORM, "
                "Dependency Injection, Pydantic Data Validation, Microservices Architecture.")
    pdf.multi_cell(0, 6, keywords)
    pdf.ln(5)
    
    # Machine Learning / AI Pipeline
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, '5. Deep Learning Pipeline & AI Models', 0, 1)
    pdf.set_font('Arial', '', 11)
    ml_desc = ("Vision Model & Inference Pipeline: Designed and simulated a 3-Layer Diagnostic Hybrid Engine using "
               "ResNet50 / InceptionV3 architectures for Deep Learning Image Classification (detecting diseases like Yellow Rust, Leaf Blast, etc.).\n\n"
               "- Layer 1 (Satellite Data): Fetches and aggregates NDVI spatial data to detect geographical crop stress.\n"
               "- Layer 2 (Environmental Matrix): Constructs a dynamic Risk Matrix using real-time Open-Meteo temperature and humidity data, "
               "overlaid with database soil moisture thresholds.\n"
               "- Layer 3 (Vision AI): Runs edge inference via CNN to spatially classify disease presence in leaf images.\n"
               "- Synthesis (Trust Logic Engine): A custom heuristic rules engine evaluates outputs from the CNN vision AI, satellite telemetry, "
               "and environmental constraints to eliminate false positives and formulate a highly accurate, single prescriptive action.")
    pdf.multi_cell(0, 6, ml_desc)
    pdf.ln(5)
    
    # Features
    pdf.add_page()
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, '6. Core Features Built & Value Delivered', 0, 1)
    pdf.set_font('Arial', '', 11)
    
    f1 = ("- Predictive Agronomy Engine: Engineered a scalable backend connecting Open-Meteo and ISRIC SoilGrids "
          "to mathematically compute real-time ET0 using the precise Penman-Monteith algorithm.\n")
    f2 = ("- 3-Layer Crop Validation System: Formulated and executed a hybrid decision matrix that significantly reduces diagnostic "
          "false positives by correlating AI visual features with macro-environmental weather constraints.\n")
    f3 = ("- Midnight Background Telemetry: Integrated an asynchronous APScheduler backend to automatically calculate and update daily "
          "soil water depletion for all user fields natively, requiring zero active inputs from farmers.\n")
    f4 = ("- Mathematical Edge-Case Safety: Hardened engine behavior by enforcing strict clamping algorithms, intelligently handling "
          "heavy monsoons with dynamic overflow logic and capping extreme drought negative values.\n")
    f5 = ("- Production Grade Architecture: Restructured legacy logic into modular, type-safe Python micro-apps. Used "
          "advanced Dependency Injection for safe, leak-free database connections and complete data serialization via Python Pydantic.\n")
    f6 = ("- Premium User Experience (UX): Hand-coded a glassmorphic dashboard architecture integrated with "
          "Fast2SMS OTP endpoints, utilizing pure JavaScript to drive single-page app (SPA) performance and immersive visualizations.")
    
    pdf.multi_cell(0, 6, f1)
    pdf.ln(2)
    pdf.multi_cell(0, 6, f2)
    pdf.ln(2)
    pdf.multi_cell(0, 6, f3)
    pdf.ln(2)
    pdf.multi_cell(0, 6, f4)
    pdf.ln(2)
    pdf.multi_cell(0, 6, f5)
    pdf.ln(2)
    pdf.multi_cell(0, 6, f6)

    # Output File
    output_path = '/home/chicmic/Desktop/smart_crop_punjab/Nishant_Kumar_Smart_Crop_Report.pdf'
    pdf.output(output_path)
    print(f"PDF generated at: {output_path}")

if __name__ == "__main__":
    create_report()

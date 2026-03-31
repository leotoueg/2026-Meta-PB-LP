import requests
import sys
from datetime import datetime, timedelta
import json

class ApexBathAPITester:
    def __init__(self, base_url="https://home-assessment-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.quiz_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            
            print(f"   Request data: {json.dumps(data, indent=2) if data else 'None'}")
            print(f"   Response status: {response.status_code}")
            print(f"   Response body: {response.text[:500]}...")

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                return True, response.json() if response.text else {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_api_root(self):
        """Test API root endpoint"""
        success, response = self.run_test(
            "API Root",
            "GET",
            "",
            200
        )
        return success

    def test_quiz_submission(self):
        """Test quiz submission endpoint"""
        test_data = {
            "home_type": "single-family",
            "timeline": "this-month",
            "address": "123 Test Street",
            "city": "Dallas",
            "zipcode": "75001",
            "full_name": "John Doe",
            "phone": "817-555-0123",
            "email": "john.doe@test.com"
        }
        
        success, response = self.run_test(
            "Quiz Submission",
            "POST",
            "quiz/submit",
            200,
            data=test_data
        )
        
        if success and 'id' in response:
            self.quiz_id = response['id']
            print(f"   Quiz ID: {self.quiz_id}")
        
        return success

    def test_appointment_booking(self):
        """Test appointment booking endpoint"""
        if not self.quiz_id:
            print("❌ Cannot test appointment booking - no quiz ID available")
            return False
            
        # Calculate a date 2 days from now
        future_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        
        test_data = {
            "quiz_id": self.quiz_id,
            "date": future_date,
            "time": "10:00 AM",
            "full_name": "John Doe",
            "phone": "817-555-0123",
            "email": "john.doe@test.com"
        }
        
        success, response = self.run_test(
            "Appointment Booking",
            "POST",
            "appointment/book",
            200,
            data=test_data
        )
        return success

    def test_quiz_submissions_list(self):
        """Test getting quiz submissions (admin endpoint)"""
        success, response = self.run_test(
            "Get Quiz Submissions",
            "GET",
            "quiz/submissions",
            200
        )
        return success

    def test_appointments_list(self):
        """Test getting appointments (admin endpoint)"""
        success, response = self.run_test(
            "Get Appointments",
            "GET",
            "appointments",
            200
        )
        return success

    def test_invalid_quiz_data(self):
        """Test quiz submission with invalid data"""
        invalid_data = {
            "home_type": "",  # Empty required field
            "timeline": "invalid-timeline",
            "address": "",
            "city": "",
            "zipcode": "",
            "full_name": "",
            "phone": "",
            "email": "invalid-email"  # Invalid email format
        }
        
        success, response = self.run_test(
            "Invalid Quiz Data",
            "POST",
            "quiz/submit",
            422,  # Expecting validation error
            data=invalid_data
        )
        return success

    def test_invalid_appointment_data(self):
        """Test appointment booking with invalid data"""
        invalid_data = {
            "quiz_id": "non-existent-id",
            "date": "invalid-date",
            "time": "",
            "full_name": "",
            "phone": "",
            "email": "invalid-email"
        }
        
        success, response = self.run_test(
            "Invalid Appointment Data",
            "POST",
            "appointment/book",
            422,  # Expecting validation error
            data=invalid_data
        )
        return success

def main():
    print("🚀 Starting Apex Bath Remodeling API Tests")
    print("=" * 50)
    
    tester = ApexBathAPITester()
    
    # Test sequence
    tests = [
        ("API Root", tester.test_api_root),
        ("Quiz Submission", tester.test_quiz_submission),
        ("Appointment Booking", tester.test_appointment_booking),
        ("Quiz Submissions List", tester.test_quiz_submissions_list),
        ("Appointments List", tester.test_appointments_list),
        ("Invalid Quiz Data", tester.test_invalid_quiz_data),
        ("Invalid Appointment Data", tester.test_invalid_appointment_data),
    ]
    
    for test_name, test_func in tests:
        try:
            test_func()
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
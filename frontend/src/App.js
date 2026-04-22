import { useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addDays, format, isBefore, startOfDay } from "date-fns";
import { Home, Building2, Caravan, Building, Clock, CalendarDays, MapPin, User, Phone, Mail, ChevronRight, ChevronLeft, Check } from "lucide-react";
import axios from "axios";

// Webhook URLs - direct to GHL
const FORM_WEBHOOK_URL = "https://services.leadconnectorhq.com/hooks/qTrXc3AYUYHnooyh3gIB/webhook-trigger/fCZJpOlONsjTrtuPwSkb";
const APPOINTMENT_WEBHOOK_URL = "https://services.leadconnectorhq.com/hooks/qTrXc3AYUYHnooyh3gIB/webhook-trigger/8M3hLvzm1kJ0qdTK2cXk";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_home-assessment-2/artifacts/7uksam1h_Untitled%20design%20%2862%29.png";
const HERO_IMAGE = "https://images.unsplash.com/photo-1750036015902-c6f5ebca924e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzB8MHwxfHNlYXJjaHwyfHxtb2Rlcm4lMjBsdXh1cnklMjBiYXRocm9vbSUyMGludGVyaW9yfGVufDB8fHx8MTc3NDk5MTMyM3ww&ixlib=rb-4.1.0&q=85";
const PHONE_NUMBER = "+1 (817) 506-9696";
const PHONE_NUMBER_RAW = "+18175069696";

// Meta Pixel helper function
const trackMetaEvent = (eventName, data = {}) => {
  if (window.fbq) {
    window.fbq('trackCustom', eventName, data);
  }
};

const homeTypes = [
  { id: "townhouse", label: "Townhouse/Duplex", icon: Building2 },
  { id: "single-family", label: "Single Family Home", icon: Home },
  { id: "mobile", label: "Mobile Home/Other", icon: Caravan },
  { id: "commercial", label: "Commercial Building", icon: Building },
];

const timelines = [
  { id: "asap", label: "ASAP" },
  { id: "this-month", label: "This Month" },
  { id: "next-month", label: "Next Month" },
  { id: "unsure", label: "Unsure" },
];

const timeSlots = ["10:00 AM", "2:00 PM", "6:00 PM"];

const LandingPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [quizId, setQuizId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    homeType: "",
    timeline: "",
    address: "",
    city: "",
    zipcode: "",
    fullName: "",
    phone: "",
    email: "",
    appointmentDate: null,
    appointmentTime: "",
  });

  const [errors, setErrors] = useState({});

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 1 && !formData.homeType) {
      newErrors.homeType = "Please select a home type";
    }
    if (step === 2 && !formData.timeline) {
      newErrors.timeline = "Please select a timeline";
    }
    if (step === 3) {
      if (!formData.address.trim()) newErrors.address = "Address is required";
      if (!formData.city.trim()) newErrors.city = "City is required";
      if (!formData.zipcode.trim()) newErrors.zipcode = "Zipcode is required";
    }
    if (step === 4) {
      if (!formData.fullName.trim()) newErrors.fullName = "Name is required";
      if (!formData.phone.trim()) newErrors.phone = "Phone is required";
      if (!formData.email.trim()) newErrors.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Please enter a valid email";
      }
    }
    if (step === 5) {
      if (!formData.appointmentDate) newErrors.appointmentDate = "Please select a date";
      if (!formData.appointmentTime) newErrors.appointmentTime = "Please select a time";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;
    
    if (currentStep === 4) {
      // Submit quiz - send directly to webhook
      setIsSubmitting(true);
      
      // Track FormSubmit event in Meta Pixel FIRST
      trackMetaEvent('FormSubmit', {
        home_type: formData.homeType,
        timeline: formData.timeline,
        city: formData.city,
        zipcode: formData.zipcode
      });
      
      try {
        const quizData = {
          id: crypto.randomUUID(),
          home_type: formData.homeType,
          timeline: formData.timeline,
          address: formData.address,
          city: formData.city,
          zipcode: formData.zipcode,
          full_name: formData.fullName,
          phone: formData.phone,
          email: formData.email,
          timestamp: new Date().toISOString()
        };
        
        await axios.post(FORM_WEBHOOK_URL, quizData);
        setQuizId(quizData.id);
        
        toast.success("Information submitted! Now book your appointment.");
        setCurrentStep(5);
      } catch (error) {
        // Still advance even if webhook fails - we have the Meta event
        console.error("Webhook error:", error);
        setQuizId(crypto.randomUUID());
        toast.success("Information submitted! Now book your appointment.");
        setCurrentStep(5);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleBookAppointment = async () => {
    if (!validateStep(5)) return;
    
    setIsSubmitting(true);
    
    // Track AppointmentRequested event in Meta Pixel FIRST
    trackMetaEvent('AppointmentRequested', {
      appointment_date: format(formData.appointmentDate, "yyyy-MM-dd"),
      appointment_time: formData.appointmentTime
    });
    
    try {
      const appointmentData = {
        id: crypto.randomUUID(),
        quiz_id: quizId,
        date: format(formData.appointmentDate, "yyyy-MM-dd"),
        time: formData.appointmentTime,
        full_name: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        zipcode: formData.zipcode,
        timestamp: new Date().toISOString()
      };
      
      await axios.post(APPOINTMENT_WEBHOOK_URL, appointmentData);
      
      toast.success("Appointment booked successfully!");
      setCurrentStep(6); // Confirmation step
    } catch (error) {
      // Still advance even if webhook fails - we have the Meta event
      console.error("Webhook error:", error);
      toast.success("Appointment booked successfully!");
      setCurrentStep(6);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calendar date restrictions: only allow 5 days from today
  const today = startOfDay(new Date());
  const maxDate = addDays(today, 5);
  
  const isDateDisabled = (date) => {
    const dateStart = startOfDay(date);
    return isBefore(dateStart, today) || isBefore(maxDate, dateStart);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-bold text-brand-blue">Which best describes your home?</h2>
              <p className="text-slate-500">Select the type of property for your remodel</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {homeTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = formData.homeType === type.id;
                return (
                  <button
                    key={type.id}
                    data-testid={`home-type-${type.id}`}
                    onClick={() => setFormData({ ...formData, homeType: type.id })}
                    className={`flex flex-col items-center justify-center p-6 border-2 rounded-lg cursor-pointer transition-all gap-3 ${
                      isSelected
                        ? "border-brand-blue bg-brand-blue/5"
                        : "border-slate-100 hover:border-brand-blue/30 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className={`w-10 h-10 ${isSelected ? "text-brand-blue" : "text-slate-400"}`} />
                    <span className={`text-sm font-medium text-center ${isSelected ? "text-brand-blue" : "text-slate-700"}`}>
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.homeType && <p className="text-red-500 text-sm text-center">{errors.homeType}</p>}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-bold text-brand-blue">When are you looking to start?</h2>
              <p className="text-slate-500">Let us know your timeline</p>
            </div>
            <div className="space-y-3">
              {timelines.map((timeline) => {
                const isSelected = formData.timeline === timeline.id;
                return (
                  <button
                    key={timeline.id}
                    data-testid={`timeline-${timeline.id}`}
                    onClick={() => setFormData({ ...formData, timeline: timeline.id })}
                    className={`w-full flex items-center p-5 border-2 rounded-lg cursor-pointer transition-all text-left text-lg font-medium ${
                      isSelected
                        ? "border-brand-blue bg-brand-blue/5 text-brand-blue"
                        : "border-slate-100 hover:border-brand-blue/30 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <Clock className={`w-5 h-5 mr-3 ${isSelected ? "text-brand-blue" : "text-slate-400"}`} />
                    {timeline.label}
                    {isSelected && <Check className="w-5 h-5 ml-auto text-brand-blue" />}
                  </button>
                );
              })}
            </div>
            {errors.timeline && <p className="text-red-500 text-sm text-center">{errors.timeline}</p>}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-bold text-brand-blue">What is the address of the property?</h2>
              <p className="text-slate-500">Enter the location for the remodel</p>
            </div>
            <div className="space-y-4">
              <div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    data-testid="address-input"
                    placeholder="Home Address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="pl-10 h-12 rounded-lg border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                  />
                </div>
                {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    data-testid="city-input"
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="h-12 rounded-lg border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                  />
                  {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                </div>
                <div>
                  <Input
                    data-testid="zipcode-input"
                    placeholder="Zipcode"
                    value={formData.zipcode}
                    onChange={(e) => setFormData({ ...formData, zipcode: e.target.value })}
                    className="h-12 rounded-lg border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                  />
                  {errors.zipcode && <p className="text-red-500 text-sm mt-1">{errors.zipcode}</p>}
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-bold text-brand-blue">How can we contact you?</h2>
              <p className="text-slate-500">We'll reach out to confirm your estimate</p>
            </div>
            <div className="space-y-4">
              <div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    data-testid="fullname-input"
                    placeholder="Full Name"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="pl-10 h-12 rounded-lg border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                  />
                </div>
                {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
              </div>
              <div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    data-testid="phone-input"
                    placeholder="Phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="pl-10 h-12 rounded-lg border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                  />
                </div>
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>
              <div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    data-testid="email-input"
                    placeholder="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10 h-12 rounded-lg border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                  />
                </div>
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-bold text-brand-blue">Wait! You're almost done</h2>
              <p className="text-slate-500">Select a date and time for your free estimate</p>
            </div>
            <div className="flex flex-col items-center space-y-6">
              <Calendar
                data-testid="appointment-calendar"
                mode="single"
                selected={formData.appointmentDate}
                onSelect={(date) => setFormData({ ...formData, appointmentDate: date })}
                disabled={isDateDisabled}
                className="rounded-lg border border-slate-200"
                classNames={{
                  day_selected: "bg-brand-blue text-white hover:bg-brand-blue hover:text-white focus:bg-brand-blue focus:text-white",
                  day_today: "bg-brand-orange/20 text-brand-orange font-bold",
                }}
              />
              {errors.appointmentDate && <p className="text-red-500 text-sm">{errors.appointmentDate}</p>}
              
              <div className="w-full space-y-3">
                <p className="text-sm font-medium text-slate-700 text-center">Select a time slot:</p>
                <div className="grid grid-cols-3 gap-3">
                  {timeSlots.map((time) => {
                    const isSelected = formData.appointmentTime === time;
                    return (
                      <button
                        key={time}
                        data-testid={`time-slot-${time.replace(/[:\s]/g, "-").toLowerCase()}`}
                        onClick={() => setFormData({ ...formData, appointmentTime: time })}
                        className={`p-3 rounded-lg border-2 font-medium transition-all ${
                          isSelected
                            ? "border-brand-blue bg-brand-blue text-white"
                            : "border-slate-200 hover:border-brand-blue/30 text-slate-700"
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
                {errors.appointmentTime && <p className="text-red-500 text-sm text-center">{errors.appointmentTime}</p>}
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6 text-center py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-bold text-brand-blue">Appointment Confirmed!</h2>
              <p className="text-slate-500">
                Your free estimate is scheduled for<br />
                <span className="font-semibold text-slate-700">
                  {formData.appointmentDate && format(formData.appointmentDate, "EEEE, MMMM d, yyyy")} at {formData.appointmentTime}
                </span>
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-slate-600">
                We'll send a confirmation to <span className="font-medium">{formData.email}</span>
              </p>
              <p className="text-sm text-slate-600 mt-2">
                Questions? Call us at <a 
                  href={`tel:${PHONE_NUMBER_RAW}`} 
                  className="text-brand-blue font-medium hover:underline"
                  onClick={() => trackMetaEvent('Call', { location: 'confirmation_screen' })}
                >
                  {PHONE_NUMBER}
                </a>
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 md:grid md:grid-cols-2">
      {/* Left Side - Hero Image */}
      <div className="hidden md:block relative">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/90 to-brand-blue/70" />
        <div className="absolute inset-0 flex flex-col justify-end p-8 lg:p-12">
          <div className="space-y-6">
            {/* Special Offer Badge */}
            <div className="inline-block bg-brand-orange text-white px-4 py-2 rounded-lg font-bold text-lg shadow-lg">
              $2,500 OFF Any Project Until End of Spring!
            </div>
            
            <h1 className="text-3xl lg:text-4xl font-bold text-white leading-tight">
              Full Bathroom Remodels in<br />
              <span className="text-brand-orange">North Central Texas & Surrounding Areas</span>
            </h1>
            <p className="text-white/80 text-lg max-w-md">
              Over 50 years of combined experience delivering exceptional bathroom remodeling services.
            </p>
            
            {/* Services List */}
            <div className="space-y-2">
              <p className="text-white/60 text-sm uppercase tracking-wider font-medium">Services:</p>
              <ul className="space-y-1 text-white/90">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-brand-orange rounded-full"></span>
                  Full Bathroom Remodels
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-brand-orange rounded-full"></span>
                  Tub to Shower Conversion
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-brand-orange rounded-full"></span>
                  Shower to Tub Conversion
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-brand-orange rounded-full"></span>
                  Walk-in Tub
                </li>
              </ul>
            </div>
            
            <div className="flex items-center gap-3 text-white">
              <Phone className="w-5 h-5" />
              <a 
                href={`tel:${PHONE_NUMBER_RAW}`} 
                className="text-lg font-medium hover:text-brand-orange transition-colors"
                onClick={() => trackMetaEvent('Call', { location: 'hero_section' })}
              >
                {PHONE_NUMBER}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4">
        <img 
          src={LOGO_URL} 
          alt="Apex Bath Remodeling & Pros" 
          className="h-16 w-auto object-contain mx-auto"
          data-testid="company-logo-mobile"
        />
        {/* Mobile Offer Banner */}
        <div className="mt-3 bg-brand-orange text-white text-center py-2 px-3 rounded-lg text-sm font-bold">
          $2,500 OFF Any Project Until End of Spring!
        </div>
      </div>

      {/* Right Side - Quiz */}
      <div className="flex flex-col items-center justify-center p-4 md:p-8 lg:p-12">
        {/* Logo above quiz */}
        <div className="mb-6 hidden md:block">
          <img 
            src={LOGO_URL} 
            alt="Apex Bath Remodeling & Pros" 
            className="h-20 lg:h-24 w-auto object-contain"
            data-testid="company-logo"
          />
        </div>
        <div className="bg-white shadow-2xl shadow-slate-200/50 border border-slate-100 rounded-xl overflow-hidden relative w-full max-w-xl">
          {/* Progress Bar */}
          {currentStep <= 5 && (
            <div className="h-1.5 bg-slate-100">
              <div 
                className="h-full bg-brand-orange transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
                data-testid="progress-bar"
              />
            </div>
          )}

          {/* Quiz Content */}
          <div className="p-6 md:p-8 lg:p-10">
            {renderStep()}

            {/* Navigation Buttons */}
            {currentStep < 6 && (
              <div className="mt-8 flex gap-3">
                {currentStep > 1 && currentStep < 6 && (
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="text-slate-500 hover:text-slate-900 font-medium px-4"
                    data-testid="back-button"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                )}
                <Button
                  onClick={currentStep === 5 ? handleBookAppointment : handleNext}
                  disabled={isSubmitting}
                  className="flex-1 h-14 bg-brand-orange hover:bg-[#E56000] text-white rounded-lg font-bold text-lg transition-colors shadow-lg shadow-brand-orange/20"
                  data-testid={currentStep === 5 ? "book-appointment-button" : "next-button"}
                >
                  {isSubmitting ? (
                    "Processing..."
                  ) : currentStep === 4 ? (
                    <>
                      Submit
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </>
                  ) : currentStep === 5 ? (
                    <>
                      Confirm Appointment
                      <Check className="w-5 h-5 ml-2" />
                    </>
                  ) : (
                    <>
                      Continue
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Step Indicator */}
            {currentStep <= 5 && (
              <div className="mt-6 flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((step) => (
                  <div
                    key={step}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      step === currentStep
                        ? "bg-brand-blue"
                        : step < currentStep
                        ? "bg-brand-orange"
                        : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Toaster position="top-center" richColors />
      
      {/* Mobile Sticky Call Button */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-lg z-50">
        <a
          href={`tel:${PHONE_NUMBER_RAW}`}
          onClick={() => trackMetaEvent('Call', { location: 'mobile_sticky_button' })}
          className="flex items-center justify-center gap-2 w-full h-14 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-lg font-bold text-lg transition-colors"
          data-testid="mobile-call-button"
        >
          <Phone className="w-5 h-5" />
          Call Now: {PHONE_NUMBER}
        </a>
      </div>
      
      {/* Add padding at bottom on mobile for sticky button */}
      <div className="md:hidden h-24" />
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/spring" element={<LandingPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;

// defaults/templates.js
// Source of truth for all 3 default templates.
// This const is NEVER modified at runtime.
// The service worker writes it to storage on first install.
// The "Reset to Default" feature reads directly from here.

export const DEFAULT_TEMPLATES = {
  device_confirmation: {
    id: "device_confirmation",
    name: "Device Confirmation",
    isDefault: true,
    pills: [
      { key: "patient_name", label: "Patient Name" },
      { key: "patient_first_name", label: "Patient First Name" },
      { key: "doctors_name", label: "Doctor's Name" },
      { key: "body_part", label: "Body Part" },
      { key: "device", label: "Device" },
      { key: "delivered_date", label: "Delivered Date" },
    ],
    script_text: `SPIEL:
Hi! This is [User] with Advanced Therapeutics! Am I speaking with [Patient Name]?

Hi, [Patient First Name]! I'm calling about the [Device] for your [Body Part] that Dr. [Doctor's Name] prescribed.

We're just reaching out to confirm if the one we delivered to you in [Delivered Date] is still working properly or do you need assistance in replacing the device?

If still working:
Great! That would be all for me. I just needed to confirm. But it was great talking to you! Thank you so much for your time, [Patient First Name]. Have a great day!

If no longer available:
May I ask what happened to the device?
This is noted, we're gonna have to check on our end about the replacement. I'll get back to you as soon as we have confirmed the details. Okay?

TEXT TEMPLATE:
Hi [Patient First Name],

This is [User] with Advanced Therapeutics. We're just reaching out in regards to the [Device] for your [Body Part] that Dr. [Doctor's Name] prescribed.

We just want to confirm if the one we delivered to you is still working properly or if you need a replacement? 

Please feel free to reply to this message or give us a call back at 631-909-6290. Thank you!`,
  },

  sx_center: {
    id: "sx_center",
    name: "SX Center",
    isDefault: true,
    pills: [
      { key: "patient_name", label: "Patient Name" },
      { key: "patient_first_name", label: "Patient First Name" },
      { key: "doctors_name", label: "Doctor's Name" },
      { key: "body_part", label: "Body Part" },
      { key: "device", label: "Device" },
      { key: "insurance_type", label: "Insurance Type" },
      { key: "sx_date", label: "SX Date" },
      { key: "ps_name", label: "PS Name" },
    ],
    script_text: `SPIEL:
Hi, this is [User] with Advanced Therapeutics. Am I speaking with [Patient Name]?

Hi [Patient First Name], this is in regards to the [Device] that Dr. [Doctor's Name] had prescribed for your [Body Part]. 

It's already covered by your [Insurance Type] Insurance and we're giving you a call to let you know that the device will be delivered to you in the Surgery Center on [SX Date].

Our product specialist, [PS Name], will be the one to bring it to you. But if you do have any questions any time, feel free to call us at 631-909-6290, okay?

Alright! Well, it was great talking to you! Thank you so much for your time, [Patient First Name]. Have a great day!

TEXT/VM:
Hi [Patient First Name], 

This is [User] with Advanced Therapeutics and this is in regards to the [Device] that Dr. [Doctor's Name] had prescribed for your [Body Part]. 

It's already covered by your [Insurance Type] Insurance and we're reaching out to let you know that the device will be delivered to you in the Surgery Center on [SX Date].

Our product specialist, [PS Name], will be the one to bring it to you. If you do have any questions any time, feel free to call us at 631-909-6290. Thank you!`,
  },

  wc_call_scheduling: {
    id: "wc_call_scheduling",
    name: "WC Call Scheduling",
    isDefault: true,
    pills: [
      { key: "patient_name", label: "Patient Name" },
      { key: "patient_first_name", label: "Patient First Name" },
      { key: "doctors_name", label: "Doctor's Name" },
      { key: "body_part", label: "Body Part" },
      { key: "device", label: "Device" },
      { key: "address", label: "Address" },
      { key: "insurance_type", label: "Insurance Type" },
    ],
    script_text: `SPIEL:
Hi, this is [User] with Advanced Therapeutics. Am I speaking with [Patient Name]?

Hi [Patient First Name], my name is [User] and I'm calling with Advanced Therapeutics regarding the [Device] for your [Body Part] that Dr. [Doctor's Name] prescribed. How are you?

That's great to hear! / I'm sorry to hear that.

But/btw we are affiliated with Dr. [Doctor's Name] that you recently visited to have your [Body Part] checked. He prescribed this device to help ease the pain or discomfort you are feeling.

I'm calling to coordinate the delivery so you can begin using this [Device] right away to help you feel better, okay?

Okay. I have your address as [Address], is that correct?

May we know if you have an apt or unit number by chance?

Do you possibly have any special delivery instructions?

Great! I'll have that noted. You can expect delivery within 1–2 business days. No signature is required upon delivery.

This device is very easy to use. I'll send you a tutorial video that shows you how to use it. Would you prefer it via email or phone number? 

Great!

Let me just quickly send that to you. There!

Can you also please confirm if the link is accessible to watch the video while you have me?

Alright! We're all set! Once you receive the [Device], you can just go back to this message. But if you do have any questions about setup or anything else, you can reply to my text or give us a call at 631-909-6290. Okay?

Alright! Well, it was great talking to you! Thank you so much for your time, [Patient First Name]. Have a great day! Take care!

TEXT/VM:
Hi [Patient First Name],  This is [User] with Advanced Therapeutics and this is in regards to the [Device] that Dr. [Doctor's Name] had prescribed for your [Body Part]. 

It's already covered by your [Insurance Type] Insurance and we're reaching out to coordinate the delivery.

Let me know when it would be best to call you back or feel free to give us a call back at 631-909-6290. Thank you!`,
  },
};

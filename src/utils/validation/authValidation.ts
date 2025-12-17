export const validateRegister = (data: any) => {
  const errors: any = {};

  if (!data.name || data.name.trim() === "") {
    errors.name = "Name is required";
  } else if (data.name.length < 2 || data.name.length > 50) {
    errors.name = "Name must be 2-50 characters";
  } else if (!/^[\p{L}\s]+$/u.test(data.name)) {
    errors.name = "Name can only contain letters and spaces";
  }

  if (!data.phone) {
    errors.phone = "Phone number is required";
  } else if (!/^03[0-9]{9}$/.test(data.phone)) {
    errors.phone = "Valid Pakistani phone number required (e.g. 03001234567)";
  }

  if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) {
    errors.email = "Invalid email address";
  }

  if (!data.password) {
    errors.password = "Password is required";
  } else {
    if (data.password.length < 8) {
      errors.password = "Password must be 8+ characters";
    }
    if (!/[A-Z]/.test(data.password)) {
      errors.password = "Must contain at least one uppercase letter";
    }
    if (!/[a-z]/.test(data.password)) {
      errors.password = "Must contain at least one lowercase letter";
    }
    if (!/[0-9]/.test(data.password)) {
      errors.password = "Must contain at least one number";
    }
    if (!/[!@#$%^&*]/.test(data.password)) {
      errors.password =
        "Must contain at least one special character (!@#$%^&*)";
    }
  }

  return errors;
};

export const validateLogin = (data: any) => {
  const errors: any = {};

  if (!data.email && !data.phone) {
    errors.general = "Email or phone number is required";
  }

  if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) {
    errors.email = "Invalid email";
  }

  if (data.phone && !/^03[0-9]{9}$/.test(data.phone)) {
    errors.phone = "Valid Pakistani phone number required";
  }

  if (!data.password) {
    errors.password = "Password is required";
  }

  return errors;
};

export const validateChangePassword = (data: any) => {
  const errors: any = {};

  if (!data.currentPassword) {
    errors.currentPassword = "Current password is required";
  }

  if (!data.newPassword) {
    errors.newPassword = "New password is required";
  } else {
    if (data.newPassword.length < 8) {
      errors.newPassword = "New password must be 8+ characters";
    }
    if (!/[A-Z]/.test(data.newPassword)) {
      errors.newPassword = "Must contain uppercase letter";
    }
    if (!/[a-z]/.test(data.newPassword)) {
      errors.newPassword = "Must contain lowercase letter";
    }
    if (!/[0-9]/.test(data.newPassword)) {
      errors.newPassword = "Must contain a number";
    }
    if (!/[!@#$%^&*]/.test(data.newPassword)) {
      errors.newPassword = "Must contain special char (!@#$%^&*)";
    }
    if (data.newPassword === data.currentPassword) {
      errors.newPassword =
        "New password must be different from current password";
    }
  }

  return errors;
};

// ------------------------- FORGOT PASSWORD -------------------------

export const validateForgotPassword = (data: any) => {
  const errors: any = {};

  if (!data.email && !data.phone) {
    errors.general = "Email or phone number is required";
  }

  if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) {
    errors.email = "Invalid email";
  }

  if (data.phone && !/^03[0-9]{9}$/.test(data.phone)) {
    errors.phone = "Valid Pakistani phone number required";
  }

  return errors;
};

// ------------------------- VERIFY OTP -------------------------

export const validateVerifyOtp = (data: any) => {
  const errors: any = {};

  if (!data.email && !data.phone) {
    errors.general = "Email or phone number is required";
  }

  if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) {
    errors.email = "Invalid email";
  }

  if (data.phone && !/^03[0-9]{9}$/.test(data.phone)) {
    errors.phone = "Valid Pakistani phone number required";
  }

  if (!data.otp) {
    errors.otp = "OTP is required";
  } else if (!/^[0-9]{6}$/.test(data.otp)) {
    errors.otp = "OTP must be 6 digits";
  }

  return errors;
};

// ------------------------- RESET PASSWORD -------------------------

export const validateResetPassword = (data: any) => {
  const errors: any = {};

  if (!data.password) {
    errors.password = "Password is required";
  } else {
    if (data.password.length < 8) {
      errors.password = "Password must be 8+ characters";
    }
    if (!/[A-Z]/.test(data.password)) {
      errors.password = "Must contain uppercase letter";
    }
    if (!/[a-z]/.test(data.password)) {
      errors.password = "Must contain lowercase letter";
    }
    if (!/[0-9]/.test(data.password)) {
      errors.password = "Must contain a number";
    }
    if (!/[!@#$%^&*]/.test(data.password)) {
      errors.password = "Must contain special char (!@#$%^&*)";
    }
  }

  return errors;
};

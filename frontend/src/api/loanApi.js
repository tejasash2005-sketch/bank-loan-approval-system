const BASE_URL = "http://localhost:5000/api";

// 🧠 CREDIT SCORE (SAFE VERSION)
export const getCreditScore = async (data) => {
  try {
    const res = await fetch(`${BASE_URL}/credit/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error("Credit API failed:", err);
    return { creditScore: 0, risk: "ERROR" };
  }
};

// 💰 EMI (SAFE VERSION)
export const calculateEMI = async (data) => {
  try {
    const res = await fetch(`${BASE_URL}/emi/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error("EMI API failed:", err);
    return { emi: 0, totalPayable: 0 };
  }
};
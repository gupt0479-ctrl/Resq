# ── 1. GENERATE SYNTHETIC DATA ──────────────────────────────────────────
#Note this file was devloped for google colab.
np.random.seed(42)
n = 730  # 2 years of daily data

dates = pd.date_range(start="2023-01-01", periods=n, freq="D")

def generate_data(business_type):
    df = pd.DataFrame()
    df["date"] = dates
    df["business_type"] = business_type
    df["day_of_week"] = df["date"].dt.dayofweek
    df["month"] = df["date"].dt.month
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["is_holiday"] = np.random.choice([0, 1], n, p=[0.94, 0.06])
    df["local_event_nearby"] = np.random.choice([0, 1], n, p=[0.85, 0.15])
    df["weather_score"] = np.random.randint(1, 6, n)

    if business_type == "restaurant":
        base_customers = 80
        avg_spend = 18
    else:  # hair salon
        base_customers = 25
        avg_spend = 65

    # Customers influenced by day, events, weather, holidays
    df["customers_that_day"] = (
        base_customers
        + df["is_weekend"] * (base_customers * 0.3)
        + df["local_event_nearby"] * 15
        + df["weather_score"] * 3
        + df["is_holiday"] * 20
        - (df["day_of_week"] == 0).astype(int) * 10  # slow Mondays
        + np.random.normal(0, 8, n)  # noise
    ).clip(0).round()

    # Revenue driven by customers + spend variance
    df["revenue_that_day"] = (
        df["customers_that_day"] * avg_spend
        + np.random.normal(0, avg_spend * 0.1, n)
    ).clip(0).round(2)

    return df

restaurant_df = generate_data("restaurant")
salon_df = generate_data("hair_salon")
df = pd.concat([restaurant_df, salon_df], ignore_index=True)

print(df.head())
print(df.describe())


# ── 2. PREPROCESS ────────────────────────────────────────────────────────
df_encoded = pd.get_dummies(df, columns=["business_type"])

features = [
    "day_of_week", "month", "is_weekend", "is_holiday",
    "local_event_nearby", "weather_score",
    "business_type_restaurant", "business_type_hair_salon"
]

X = df_encoded[features]
y_customers = df_encoded["customers_that_day"]
y_revenue = df_encoded["revenue_that_day"]

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)


# ── 3. TRAIN MODELS ──────────────────────────────────────────────────────
customer_model = RandomForestRegressor(n_estimators=100, random_state=42)
revenue_model = RandomForestRegressor(n_estimators=100, random_state=42)

customer_model.fit(X_scaled, y_customers)

# Feed predicted customers as a feature into revenue model
X_with_customers = X.copy()
X_with_customers["predicted_customers"] = customer_model.predict(X_scaled)
X_with_customers_scaled = scaler.fit_transform(X_with_customers)

revenue_model.fit(X_with_customers_scaled, y_revenue)


# ── 4. K-FOLD VALIDATION (from your lab) ────────────────────────────────
kf = KFold(n_splits=5, shuffle=True, random_state=42)

customer_scores = cross_val_score(
    customer_model, X_scaled, y_customers,
    cv=kf, scoring="r2"
)
print(f"Customer Model R² scores: {customer_scores.round(3)}")
print(f"Average R²: {customer_scores.mean():.3f}")


# ── 5. PREDICTION FUNCTION (this is what your agent calls) ───────────────
def predict_for_day(business_type, day_of_week, month,
                    is_weekend, is_holiday, local_event, weather_score):

    input_data = pd.DataFrame([{
        "day_of_week": day_of_week,
        "month": month,
        "is_weekend": is_weekend,
        "is_holiday": is_holiday,
        "local_event_nearby": local_event,
        "weather_score": weather_score,
        "business_type_restaurant": 1 if business_type == "restaurant" else 0,
        "business_type_hair_salon": 1 if business_type == "hair_salon" else 0,
    }])

    input_scaled = scaler.transform(input_data)
    predicted_customers = customer_model.predict(input_scaled)[0]

    input_data["predicted_customers"] = predicted_customers
    input_with_customers_scaled = scaler.transform(input_data)
    predicted_revenue = revenue_model.predict(input_with_customers_scaled)[0]

    return {
        "business_type": business_type,
        "predicted_customers": round(predicted_customers),
        "predicted_revenue": round(predicted_revenue, 2)
    }

# Test it
print(predict_for_day("restaurant", day_of_week=5, month=7,
                       is_weekend=1, is_holiday=0,
                       local_event=1, weather_score=5))

print(predict_for_day("hair_salon", day_of_week=1, month=1,
                       is_weekend=0, is_holiday=0,
                       local_event=0, weather_score=2))
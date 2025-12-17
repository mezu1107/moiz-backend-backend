import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CreditCard, Wallet, Building2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { Order } from "@/lib/mockData";

export const Checkout = () => {
  const navigate = useNavigate();
  const { cart, clearCart, currentUser, addOrder } = useStore();
  const [paymentMethod, setPaymentMethod] = useState<
    "cod" | "easypaisa" | "jazzcash" | "bank"
  >("cod");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const subtotal = cart.reduce(
    (sum, item) => sum + item.menuItem.price * item.quantity,
    0
  );
  const deliveryFee = 100;
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();

    if (!deliveryAddress || !phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      userId: currentUser?.id || "guest",
      items: cart,
      total,
      status: "pending",
      paymentMethod,
      deliveryAddress,
      createdAt: new Date().toISOString(),
    };

    addOrder(newOrder);
    clearCart();
    toast.success("Order placed successfully!");
    navigate(`/track-order/${newOrder.id}`);
  };

  const paymentOptions = [
    { value: "cod", label: "Cash on Delivery", icon: CreditCard },
    { value: "easypaisa", label: "Easypaisa", icon: Smartphone },
    { value: "jazzcash", label: "JazzCash", icon: Wallet },
    { value: "bank", label: "Bank Transfer", icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">
            Checkout
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Complete your order details
          </p>
        </motion.div>

        <form onSubmit={handlePlaceOrder}>
          <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Delivery Details */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card rounded-xl p-4 sm:p-6 shadow-sm border"
              >
                <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">
                  Delivery Information
                </h2>

                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-sm sm:text-base">
                      Full Name *
                    </Label>
                    <Input
                      id="name"
                      defaultValue={currentUser?.name || ""}
                      required
                      className="text-sm sm:text-base"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-sm sm:text-base">
                      Phone Number *
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+92 370 9447916"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="text-sm sm:text-base"
                    />
                  </div>

                  <div>
                    <Label htmlFor="address" className="text-sm sm:text-base">
                      Delivery Address *
                    </Label>
                    <Textarea
                      id="address"
                      placeholder="House/Flat number, Street name, Area"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      rows={3}
                      required
                      className="text-sm sm:text-base"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes" className="text-sm sm:text-base">
                      Special Instructions (Optional)
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="Any special instructions for delivery..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="text-sm sm:text-base"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Payment Method */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card rounded-xl p-4 sm:p-6 shadow-sm border"
              >
                <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">
                  Payment Method
                </h2>

                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(value: any) => setPaymentMethod(value)}
                >
                  <div className="space-y-2 sm:space-y-3">
                    {paymentOptions.map((option) => (
                      <div
                        key={option.value}
                        className={`flex items-center space-x-2 sm:space-x-3 p-3 sm:p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          paymentMethod === option.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => setPaymentMethod(option.value as any)}
                      >
                        <RadioGroupItem
                          value={option.value}
                          id={option.value}
                        />
                        <Label
                          htmlFor={option.value}
                          className="flex-1 cursor-pointer flex items-center gap-2 sm:gap-3"
                        >
                          <option.icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                          <span className="font-medium text-sm sm:text-base">
                            {option.label}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>

                {paymentMethod !== "cod" && (
                  <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-muted rounded-lg">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      📸 Payment instructions will be sent after order
                      placement. Please upload your payment receipt.
                    </p>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card rounded-xl p-4 sm:p-6 shadow-sm border sticky top-20"
              >
                <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">
                  Order Summary
                </h2>

                <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                  {cart.map((item) => (
                    <div
                      key={item.menuItem.id}
                      className="flex justify-between text-xs sm:text-sm"
                    >
                      <span className="text-muted-foreground">
                        {item.menuItem.name} × {item.quantity}
                      </span>
                      <span className="font-medium">
                        Rs. {item.menuItem.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 border-t pt-2 sm:pt-3">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">Rs. {subtotal}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <span className="font-medium">Rs. {deliveryFee}</span>
                  </div>
                  <div className="border-t pt-2 sm:pt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold text-base sm:text-lg">
                        Total
                      </span>
                      <span className="font-bold text-xl sm:text-2xl text-primary">
                        Rs. {total}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full text-sm sm:text-base"
                >
                  Place Order
                </Button>

                <p className="text-[10px] sm:text-xs text-muted-foreground text-center mt-3 sm:mt-4">
                  By placing this order, you agree to our terms and conditions
                </p>
              </motion.div>
            </div>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
};

export default Checkout;

import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export const Cart = () => {
  const navigate = useNavigate();
  const { cart, updateCartQuantity, removeFromCart, clearCart } = useStore();

  const subtotal = cart.reduce((sum, item) => {
    const addOnsTotal = (item.addOns || []).reduce((addOnSum, addOn) => addOnSum + addOn.price, 0);
    return sum + (item.menuItem.price + addOnsTotal) * item.quantity;
  }, 0);
  const deliveryFee = cart.length > 0 ? 100 : 0;
  const total = subtotal + deliveryFee;

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error("Your cart is empty!");
      return;
    }
    navigate("/checkout");
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md mx-auto"
          >
            <div className="w-24 h-24 rounded-full bg-muted mx-auto mb-6 flex items-center justify-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
            <p className="text-muted-foreground mb-8">
              Looks like you haven't added any items to your cart yet. Start browsing our menu!
            </p>
            <Button size="lg" asChild>
              <Link to="/menu">
                Browse Menu
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">Shopping Cart</h1>
          <p className="text-sm sm:text-base text-muted-foreground">{cart.length} items in your cart</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            {cart.map((item, index) => (
              <motion.div
                key={item.menuItem.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-xl p-3 sm:p-4 shadow-sm border"
              >
                <div className="flex gap-3 sm:gap-4">
                  <img
                    src={item.menuItem.image}
                    alt={item.menuItem.name}
                    className="w-16 h-16 sm:w-24 sm:h-24 rounded-lg object-cover"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1 sm:mb-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm sm:text-lg truncate">{item.menuItem.name}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 hidden sm:block">
                          {item.menuItem.description}
                        </p>
                        {item.addOns && item.addOns.length > 0 && (
                          <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-muted-foreground">
                            <span className="font-medium">Add-ons:</span> {item.addOns.map(a => a.name).join(", ")}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
                        onClick={() => {
                          removeFromCart(item.menuItem.id);
                          toast.success("Item removed from cart");
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 sm:h-8 sm:w-8"
                          onClick={() => updateCartQuantity(item.menuItem.id, Math.max(1, item.quantity - 1))}
                        >
                          <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </Button>
                        <span className="w-6 sm:w-12 text-center font-medium text-xs sm:text-base">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 sm:h-8 sm:w-8"
                          onClick={() => updateCartQuantity(item.menuItem.id, item.quantity + 1)}
                        >
                          <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </Button>
                      </div>
                      <p className="font-bold text-sm sm:text-lg">
                        Rs. {((item.menuItem.price + (item.addOns || []).reduce((sum, a) => sum + a.price, 0)) * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            <Button
              variant="outline"
              className="w-full text-sm sm:text-base"
              onClick={() => {
                clearCart();
                toast.success("Cart cleared");
              }}
            >
              Clear Cart
            </Button>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card rounded-xl p-4 sm:p-6 shadow-sm border sticky top-20"
            >
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Order Summary</h2>

              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
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
                    <span className="font-semibold text-base sm:text-lg">Total</span>
                    <span className="font-bold text-xl sm:text-2xl text-primary">Rs. {total}</span>
                  </div>
                </div>
              </div>

              <Button size="lg" className="w-full mb-3 sm:mb-4 text-sm sm:text-base" onClick={handleCheckout}>
                Proceed to Checkout
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>

              <Button variant="outline" size="lg" className="w-full text-sm sm:text-base" asChild>
                <Link to="/menu">Continue Shopping</Link>
              </Button>

              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-muted rounded-lg">
                <p className="text-xs sm:text-sm text-muted-foreground text-center">
                  🎉 Free delivery on orders above Rs. 1000
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Cart;

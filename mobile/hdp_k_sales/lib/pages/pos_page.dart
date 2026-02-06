import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hdp_k_sales/main.dart'; // for supabase client
import 'package:hdp_k_sales/services/ping_service.dart';
import 'package:intl/intl.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_fonts/google_fonts.dart';

class POSPage extends StatefulWidget {
  final Function(int)? onTabChange;
  
  const POSPage({super.key, this.onTabChange});

  @override
  State<POSPage> createState() => _POSPageState();
}

class _POSPageState extends State<POSPage> {
  // Data
  List<Map<String, dynamic>> products = [];
  List<Map<String, dynamic>> filteredProducts = [];
  List<Map<String, dynamic>> categories = [];
  List<Map<String, dynamic>> customers = [];
  
  // State
  bool _isLoading = true;
  bool _isCheckingOut = false;
  String _searchQuery = '';
  String? _selectedCategoryId;
  Map<String, dynamic>? _selectedCustomer;
  String _paymentMethod = 'cash';
  final TextEditingController _discountController = TextEditingController();
  final TextEditingController _orderNotesController = TextEditingController();
  double _discountAmount = 0.0;
  String? _employeeId;
  String? _employeeName;

  // Cart: Key: variant_id, Value: quantity
  final Map<String, int> cart = {}; 
  final Map<String, dynamic> productMap = {};

  final currencyFormat = NumberFormat.currency(locale: 'en_KE', symbol: 'KES ');

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    try {
      // 1. Fetch Products with Images and Inventory
      final pRes = await supabase
          .from('product_variants')
          .select('id, variant_name, price, sku, product_id, reorder_level, products(name, image_url), inventory(quantity)')
          .eq('is_active', true)
          .order('variant_name');
      
      // 2. Fetch Categories
      final cRes = await supabase
          .from('product_categories')
          .select('id, name')
          .order('name');

      // 3. Fetch Customers for checkout with credit info
      final custRes = await supabase
          .from('customers')
          .select('id, name, phone, customer_type, credit_balance, credit_limit')
          .eq('is_active', true)
          .order('name');
          
      // 4. Fetch Employee ID
      final user = supabase.auth.currentUser;
      if (user != null) {
        final empRes = await supabase
           .from('employees')
           .select('id, full_name')
           .eq('user_id', user.id)
           .maybeSingle();
        if (empRes != null) {
          _employeeId = empRes['id'];
          _employeeName = empRes['full_name'];
        }
      }

      if (mounted) {
        setState(() {
          products = List<Map<String, dynamic>>.from(pRes);
          categories = List<Map<String, dynamic>>.from(cRes);
          customers = List<Map<String, dynamic>>.from(custRes);
          
          for (var p in products) {
            productMap[p['id']] = p;
          }
          filteredProducts = products;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        _showSnack('Error loading data: $e', Colors.red);
      }
    }
  }

  String _getProductName(Map<String, dynamic> product) {
    final pName = product['products'] != null ? product['products']['name'] : '';
    final vName = product['variant_name'] ?? '';
    if (vName == 'Standard' || vName == 'Default' || vName == pName) {
      return pName;
    }
    return '$pName - $vName';
  }

  void _filterProducts() {
    setState(() {
      filteredProducts = products.where((p) {
        final pName = (p['products'] != null ? p['products']['name'] as String : '').toLowerCase();
        final vName = (p['variant_name'] as String).toLowerCase();
        final sku = (p['sku'] as String).toLowerCase();
        final search = _searchQuery.toLowerCase();
        
        return pName.contains(search) || vName.contains(search) || sku.contains(search);
      }).toList();
    });
  }

  void _addToCart(String id) {
    setState(() {
      cart[id] = (cart[id] ?? 0) + 1;
    });
  }

  void _removeFromCart(String id) {
    setState(() {
      if (cart.containsKey(id) && cart[id]! > 0) {
        cart[id] = cart[id]! - 1;
        if (cart[id] == 0) cart.remove(id);
      }
    });
  }

  double get _total {
    double sum = 0;
    cart.forEach((id, qty) {
      final product = productMap[id];
      if (product != null) {
        sum += (product['price'] as num).toDouble() * qty;
      }
    });
    return sum;
  }

  // --- Add Customer Modal ---
  void _showAddCustomerModal() {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => AlertDialog(
          title: Text('Add New Customer', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                decoration: InputDecoration(
                  labelText: 'Customer Name',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneCtrl,
                decoration: InputDecoration(
                  labelText: 'Phone Number',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                keyboardType: TextInputType.phone,
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFF6600),
                foregroundColor: Colors.white,
              ),
              onPressed: isSubmitting ? null : () async {
                if (nameCtrl.text.isEmpty) return;
                setModalState(() => isSubmitting = true);
                try {
                  final user = supabase.auth.currentUser;
                  final res = await supabase.from('customers').insert({
                    'name': nameCtrl.text,
                    'phone': phoneCtrl.text,
                    'customer_type': 'normal',
                    'created_by': user?.id
                  }).select().single();
                  
                  setState(() {
                    customers.add(res);
                    customers.sort((a, b) => (a['name'] as String).compareTo(b['name']));
                    _selectedCustomer = res; // Auto-select new customer
                  });
                  Navigator.pop(ctx); // Close dialog
                  // Note: We might need to refresh the parent sheet if it needs to see the new selection
                } catch (e) {
                  _showSnack('Failed to add customer: $e', Colors.red);
                } finally {
                  setModalState(() => isSubmitting = false);
                }
              },
              child: isSubmitting ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Add Customer'),
            ),
          ],
        ),
      ),
    );
  }

  // --- Checkout Sheet ---
  void _showCheckoutSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setSheetState) => Container(
          height: MediaQuery.of(context).size.height * 0.85,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Handle
              Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 16),
              
              Text('Checkout', style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.bold)),
              const SizedBox(height: 24),

              // Customer Selector
              Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey[300]!),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          isExpanded: true,
                          hint: Text('Select Customer', style: GoogleFonts.inter(color: Colors.grey)),
                          value: _selectedCustomer?['id'],
                          items: customers.map((c) => DropdownMenuItem(
                            value: c['id'] as String,
                            child: Text(c['name'], style: GoogleFonts.inter()),
                          )).toList(),
                          onChanged: (val) {
                            setSheetState(() {
                              _selectedCustomer = customers.firstWhere((c) => c['id'] == val);
                            });
                          },
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  FloatingActionButton.small(
                    onPressed: _showAddCustomerModal,
                    backgroundColor: const Color(0xFFFF6600),
                    child: const Icon(Icons.person_add, color: Colors.white),
                  ),
                ],
              ),
               if (_selectedCustomer != null)
                 Padding(
                   padding: const EdgeInsets.only(top: 8),
                   child: Column(
                     crossAxisAlignment: CrossAxisAlignment.start,
                     children: [
                       Text('Client: ${_selectedCustomer!['name']} (${_selectedCustomer!['phone'] ?? 'No phone'})', style: GoogleFonts.inter(fontSize: 12, color: Colors.green[700], fontWeight: FontWeight.w500)),
                       if (_selectedCustomer!['customer_type'] == 'credit' || (_selectedCustomer!['credit_balance'] ?? 0) > 0)
                         Text('Unpaid Balance: ${currencyFormat.format(_selectedCustomer!['credit_balance'] ?? 0)} / Limit: ${currencyFormat.format(_selectedCustomer!['credit_limit'] ?? 0)}', 
                           style: GoogleFonts.inter(fontSize: 11, color: Colors.red[700], fontWeight: FontWeight.bold)),
                     ],
                   ),
                 ),
              
              const SizedBox(height: 24),
              Text('Order Summary', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
              
              // Cart List
              Expanded(
                child: ListView.separated(
                  itemCount: cart.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final id = cart.keys.elementAt(index);
                    final qty = cart[id]!;
                    final product = productMap[id];
                    final price = (product['price'] as num).toDouble();
                    
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Row(
                        children: [
                          Container(
                            width: 40, height: 40,
                            decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(8)),
                            child: const Icon(Icons.shopping_bag_outlined, size: 20, color: Colors.grey),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(_getProductName(product), style: GoogleFonts.inter(fontWeight: FontWeight.w500)),
                                Text(currencyFormat.format(price), style: GoogleFonts.inter(fontSize: 12, color: Colors.grey)),
                              ],
                            ),
                          ),
                          Text('x$qty', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                          const SizedBox(width: 16),
                          Text(currencyFormat.format(price * qty), style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                        ],
                      ),
                    );
                  },
                ),
              ),

              const Divider(),
              const SizedBox(height: 16),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Subtotal', style: GoogleFonts.inter(fontSize: 14, color: Colors.grey[600])),
                  Text(currencyFormat.format(_total), style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold)),
                ],
              ),
              const SizedBox(height: 12),
              
              // Discount Input
              Row(
                children: [
                   Expanded(
                     child: TextField(
                       controller: _discountController,
                       keyboardType: TextInputType.number,
                       decoration: InputDecoration(
                         labelText: 'Discount Amount',
                         isDense: true,
                         border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                         prefixText: 'KES ',
                       ),
                       onChanged: (val) {
                         setSheetState(() {
                           _discountAmount = double.tryParse(val) ?? 0.0;
                         });
                       },
                     ),
                   ),
                ],
              ),
              const SizedBox(height: 12),
              
              const Divider(),
              const SizedBox(height: 16),

              const Divider(),
              const SizedBox(height: 16),

              // Order Notes
              TextField(
                controller: _orderNotesController,
                decoration: InputDecoration(
                  labelText: 'Order Notes / Instructions',
                  alignLabelWithHint: true,
                  isDense: true,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  prefixIcon: const Icon(Icons.note_alt_outlined, size: 18),
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 16),

              // Payment Method
              Text('Payment Method', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w500)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _paymentChip('Cash', 'cash', setSheetState),
                  _paymentChip('M-Pesa', 'till', setSheetState),
                  _paymentChip('Bank', 'nat', setSheetState),
                  _paymentChip('Credit', 'credit', setSheetState, enabled: _selectedCustomer != null),
                ],
              ),
              const SizedBox(height: 24),

              // Total & Action
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Total Amount', style: GoogleFonts.inter(fontSize: 16, color: Colors.grey[600])),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      if (_discountAmount > 0)
                        Text(currencyFormat.format(_total), style: GoogleFonts.inter(fontSize: 14, decoration: TextDecoration.lineThrough, color: Colors.grey)),
                      Text(currencyFormat.format(_totalAfterDiscount), style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.bold, color: const Color(0xFFFF6600))),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 24),
              
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isCheckingOut || (_paymentMethod == 'credit' && _selectedCustomer == null) ? null : () async {
                    // Navigator.pop(ctx); // Don't close immediately, let process handle it
                    await _processCheckout();
                    Navigator.pop(ctx); // Close sheet on success or failure handled
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.black,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 20),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text(_paymentMethod == 'credit' && _selectedCustomer == null ? 'Select Customer for Credit' : 'CONFIRM SALE', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  double get _totalAfterDiscount => (_total - _discountAmount).clamp(0.0, double.infinity);

  Widget _paymentChip(String label, String value, StateSetter setSheetState, {bool enabled = true}) {
    final isSelected = _paymentMethod == value;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: enabled ? (sel) => setSheetState(() => _paymentMethod = value) : null,
      selectedColor: const Color(0xFFFF6600).withOpacity(0.1),
      labelStyle: GoogleFonts.inter(color: isSelected ? const Color(0xFFFF6600) : (enabled ? Colors.black : Colors.grey), fontWeight: isSelected ? FontWeight.bold : FontWeight.normal),
      side: BorderSide(color: isSelected ? const Color(0xFFFF6600) : Colors.grey[300]!),
      backgroundColor: Colors.transparent,
      disabledColor: Colors.grey[100],
    );
  }


  Future<void> _processCheckout() async {
    if (cart.isEmpty) return;
    setState(() => _isCheckingOut = true);

    User? user;
    Position? position;

    try {
      user = supabase.auth.currentUser;
      if (user == null) throw 'User not logged in';
      if (_employeeId == null) throw 'Employee profile not found. Contact Admin.';
      
      // Get Location
      try {
        LocationPermission permission = await Geolocator.checkPermission();
        if (permission == LocationPermission.denied) permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.whileInUse || permission == LocationPermission.always) {
            position = await Geolocator.getCurrentPosition();
        }
      } catch (e) { print("Loc Error: $e"); }

      // Validate Credit Limit
      if (_paymentMethod == 'credit') {
        if (_selectedCustomer == null) throw 'Customer required for credit sale';
        if (_selectedCustomer!['customer_type'] != 'credit') throw 'Customer not approved for credit';
        
        final currentBalance = (_selectedCustomer!['credit_balance'] as num? ?? 0).toDouble();
        final creditLimit = (_selectedCustomer!['credit_limit'] as num? ?? 0).toDouble();
        
        if (currentBalance + _totalAfterDiscount > creditLimit) {
           throw 'Credit limit exceeded. Available: ${currencyFormat.format(creditLimit - currentBalance)}';
        }
      }

      final orderRes = await supabase.from('sales_orders').insert({
        'created_by': user.id,
        'sales_agent_id': _employeeId, // Required for commission trigger
        'customer_id': _selectedCustomer?['id'],
        'status': 'pending',
        'payment_method': _paymentMethod,
        'is_credit_sale': _paymentMethod == 'credit',
        'delivery_format': 'POS',
        'subtotal': _total,
        'discount_amount': _discountAmount,
        'tax_amount': 0,
        'total_amount': _totalAfterDiscount,
        'notes': _orderNotesController.text.isEmpty ? null : _orderNotesController.text,
        'latitude': position?.latitude,
        'longitude': position?.longitude,
      }).select().single();

      final orderId = orderRes['id'];

      // Verify Location
      PingService.verifyAndLog(
        recordType: 'order',
        recordId: orderId,
        userId: user.id,
      );

      // Create Items
      final List<Map<String, dynamic>> orderItems = [];
      cart.forEach((variantId, qty) {
        final product = productMap[variantId];
        final price = (product['price'] as num).toDouble();
        orderItems.add({
          'order_id': orderId,
          'variant_id': variantId,
          'quantity': qty,
          'unit_price': price,
          'total_price': price * qty, // We should probably store discount per item if applicable, but global discount is simpler
        });
      });

      await supabase.from('sales_order_items').insert(orderItems);

      if (mounted) {
        // Close Checkout Sheet if open (it is open as a modal)
        // We are in _processCheckout which is called from the sheet.
        // We need to close the sheet first.
        Navigator.of(context).pop(); // Close Checkout Sheet
        
        // Show Success Snack
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Sale Recorded: ${currencyFormat.format(_totalAfterDiscount)}', style: GoogleFonts.inter()),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 2),
          )
        );

        // Reset and Go Home
        _resetState();
        widget.onTabChange?.call(0);
      }
    } catch (e) {
      if (mounted) {
        _showErrorDialog('Checkout failed: $e'); 
      }
    } finally {
      if (mounted) setState(() => _isCheckingOut = false);
    }
  }

  void _showErrorDialog(String msg) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Error'),
        content: Text(msg),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))
        ],
      ),
    );
  }

  void _resetState() {
     setState(() {
        cart.clear();
        _selectedCustomer = null;
        _paymentMethod = 'cash';
        _discountAmount = 0.0;
        _discountController.clear();
        _orderNotesController.clear();
     });
  }

  void _showSnack(String msg, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg, style: GoogleFonts.inter()), backgroundColor: color));
  }

  Widget _buildStockBadge(Map<String, dynamic> product) {
    final inventory = product['inventory'];
    final quantity = (inventory != null && inventory['quantity'] != null) ? inventory['quantity'] as int : 0;
    final reorderLevel = product['reorder_level'] as int? ?? 10;
    
    final isLowStock = quantity <= reorderLevel;
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isLowStock ? Colors.red.withOpacity(0.9) : Colors.black.withOpacity(0.6),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        isLowStock ? 'LOW STOCK: $quantity' : 'Stock: $quantity',
        style: GoogleFonts.inter(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      body: SafeArea(
        child: Column(
          children: [
            // --- Header ---
            Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(24)),
                boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, 4))],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                       IconButton(
                         icon: const Icon(Icons.arrow_back), 
                         onPressed: () {
                           if (widget.onTabChange != null) {
                             widget.onTabChange!(0); // Go to Home Tab
                           } else {
                             Navigator.of(context).pop(); // Back if pushed as route
                           }
                         },
                       ),
                       const SizedBox(width: 8),
                       Column(
                         crossAxisAlignment: CrossAxisAlignment.start,
                         children: [
                           Text('Smart POS', style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.bold)),
                           if (_employeeName != null) 
                             Text('Agent: $_employeeName', style: GoogleFonts.inter(fontSize: 12, color: Colors.grey[600])),
                         ],
                       ),
                       const Spacer(),
                       IconButton(icon: const Icon(Icons.sync), onPressed: _fetchData, tooltip: 'Refresh Data'),
                    ],
                  ),
                  const SizedBox(height: 16),
                  
                  // Search Bar
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.grey[100],
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: TextField(
                            onChanged: (val) {
                              _searchQuery = val;
                              _filterProducts();
                            },
                            style: GoogleFonts.inter(),
                            decoration: const InputDecoration(
                              hintText: 'Search products...',
                              prefixIcon: Icon(Icons.search, color: Colors.grey),
                              border: InputBorder.none,
                              contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      
                      // Category Filter (Trigger)
                      Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFFF6600),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: PopupMenuButton<String>(
                          icon: const Icon(Icons.filter_list, color: Colors.white),
                          onSelected: (val) {
                            // Implement rigid category filtering if foreign keys exist
                            // For now, reset search or handle logic
                          },
                          itemBuilder: (ctx) => [
                            const PopupMenuItem(value: 'all', child: Text('All Categories')),
                            ...categories.map((c) => PopupMenuItem(value: c['id'] as String, child: Text(c['name']))),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // --- Grid ---
            Expanded(
              child: _isLoading 
                ? const Center(child: CircularProgressIndicator(color: Color(0xFFFF6600))) 
                : filteredProducts.isEmpty 
                  ? Center(child: Text("No products found", style: GoogleFonts.inter(color: Colors.grey)))
                  : GridView.builder(
                      padding: const EdgeInsets.all(16),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 0.8,
                        crossAxisSpacing: 16,
                        mainAxisSpacing: 16,
                      ),
                      itemCount: filteredProducts.length,
                      itemBuilder: (context, index) {
                        final product = filteredProducts[index];
                        final id = product['id'];
                        final qty = cart[id] ?? 0;
                        final price = (product['price'] as num).toDouble();
                        
                        return Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))],
                          ),
                          child: Material(
                            color: Colors.transparent,
                            child: InkWell(
                              borderRadius: BorderRadius.circular(20),
                              onTap: () => _addToCart(id),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                   // Image / Placeholder
                                   Expanded(
                                     child: Container(
                                       width: double.infinity,
                                       decoration: BoxDecoration(
                                         color: Colors.grey[100],
                                         borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                                       ),
                                       clipBehavior: Clip.antiAlias,
                                       child: Stack(
                                         fit: StackFit.expand,
                                         children: [
                                           // Product Image
                                           if (product['products']?['image_url'] != null)
                                              Image.network(
                                                product['products']['image_url'],
                                                fit: BoxFit.cover,
                                                errorBuilder: (context, error, stackTrace) => Center(
                                                  child: Icon(Icons.broken_image_outlined, color: Colors.grey[300], size: 40),
                                                ),
                                              )
                                           else
                                              Center(
                                                child: Text(
                                                  _getProductName(product).isEmpty ? '?' : _getProductName(product).substring(0, 1).toUpperCase(),
                                                  style: GoogleFonts.inter(fontSize: 32, fontWeight: FontWeight.w900, color: Colors.grey[300]),
                                                ),
                                              ),
                                           
                                           // Stock Indicator Badge
                                           Positioned(
                                             top: 8,
                                             left: 8,
                                             child: _buildStockBadge(product),
                                           ),
                                         ],
                                       ),
                                     ),
                                   ),
                                  // Details
                                  Padding(
                                    padding: const EdgeInsets.all(12),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(_getProductName(product), style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13), maxLines: 2, overflow: TextOverflow.ellipsis),
                                        const SizedBox(height: 4),
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(currencyFormat.format(price), style: GoogleFonts.inter(fontWeight: FontWeight.w600, color: const Color(0xFFFF6600))),
                                            if (qty > 0)
                                              Container(
                                                padding: const EdgeInsets.all(6),
                                                decoration: const BoxDecoration(color: Colors.black, shape: BoxShape.circle),
                                                child: Text('$qty', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                                              )
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),

            // --- Bottom Bar ---
            if (cart.isNotEmpty)
              Container(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 90), // Added bottom padding to clear floating nav
                decoration: const BoxDecoration(
                  color: Colors.white,
                  boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 20, offset: Offset(0, -5))],
                ),
                child: Row(
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${cart.values.fold(0, (a, b) => a + b)} items', style: GoogleFonts.inter(color: Colors.grey, fontSize: 12)),
                        Text(currencyFormat.format(_total), style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const Spacer(),
                    ElevatedButton(
                      onPressed: _showCheckoutSheet,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.black,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: Row(
                        children: [
                          const Text("Checkout"),
                          const SizedBox(width: 8),
                          const Icon(Icons.arrow_forward, size: 16),
                        ],
                      ),
                    )
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

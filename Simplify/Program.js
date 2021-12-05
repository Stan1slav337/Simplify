function clearInput() {

	document.getElementById("myText").value = "";

}

function addCharacter(ch) {

	document.getElementById("myText").value += ch;
	
}

var dummy;
var t;

var str;
var initial_str;

var paragraph;
var edit_id;

const R = 20;
var max_h;
var max_w;
var last_x;

var Chunks = [];
var Chunks_parts = [];
var Chunks_hash = new Map();

const specials = '⊤⊥';
const tautolog_ch = '⊤';
const contradict_ch = '⊥';
const conects = '∧∨⇒⇔';
const disjunct_ch = '∨';
const conjunct_ch = '∧';
const implic_ch = '⇒';
const equiv_ch = '⇔';
const neg_ch = '¬';
const logic_equiv = ' ∼ ';

var Encrypt = new Map();
var Decrypt = new Map();

class Node {
    constructor(value, parent = null) {
        this.value = value
        this.children = []
		this.parent = parent
		this.isNeg = false
		this.l = 0
		this.r = 0
		this.x = 0
		this.y = 0
    }
}

function isUpper(ch) {

	return ((ch.toUpperCase() != ch.toLowerCase()) && (ch == ch.toUpperCase()));
	
}

function tableFND(results) {

	const atoms = Math.log2(results.length);
	let ans = "";
	
	let cnt = 0;
	
	for(var i = 0; i < results.length; ++i)
		if(results[i] == 'A')
			cnt++;
	
	for(var i = 0; i < results.length; ++i)
		if(results[i] == 'A') {
		
			if(atoms > 1)
				ans += '(';
			
			for(var j = 0; j < atoms; ++j) {
			
				if((i & (1 << (atoms - j - 1))) == 0)
					ans += neg_ch;
					
				ans += Decrypt.get(Chunks[j]);
				
				if(j != atoms - 1)
					ans += ' ' + conjunct_ch + ' ';
			
			}
			
			if(atoms > 1)
				ans += ')';
			
			cnt--;
			
			if(cnt != 0)
				ans += ' ' + disjunct_ch + ' ';
		
		}
		
	if(ans.length == 0)
		ans = results[0] == 'F' ? contradict_ch : tautolog_ch;
		
	paragraph = document.createElement("p");
	paragraph.innerHTML = "FND din tabelul de adevăr: " + ans;
	
	if(document.getElementById("myTableFND").checked)
		document.getElementById("myOutput").appendChild(paragraph);

}

function getPositions(node, lvl = 0) {
	
	if(node.children.length == 0) {
	
		node.x = last_x;
		last_x += 2 * R + 10;
	
	}
	else {
	
		node.x = 0;
	
		for(var child of node.children)
			node.x += getPositions(child, lvl + 1);
			
		node.x /= node.children.length;
		
	}
	
	node.y = lvl * 50 + R + 1;
	
	max_w = Math.max(max_w, node.x);
	max_h = Math.max(max_h, node.y);
		
	return node.x;

}

function drawTree(to_highlight) {

	if(!document.getElementById("myTransformsWithTree").checked)
		return;

	max_h = 0;
	max_w = 0;
	last_x = R + 1;
	getPositions(dummy.children[0]);

	var canvas = document.createElement("canvas");
	canvas.setAttribute("width", max_w + R + 1);
	canvas.setAttribute("height", max_h + R + 61);
	
	var ctx = canvas.getContext("2d");
	ctx.font = '20px Calibri';
	ctx.strokeStyle = "#000";
	ctx.fillStyle = "#FFFF00";
	
	var cur_lvl = [dummy.children[0]];
	
	while(cur_lvl.length) {
	
		var next_lvl = [];
		
		for(var node of cur_lvl) {
		
			var [x, y] = [node.x, node.y];
			
			ctx.beginPath();
			ctx.arc(x, y, R, 0, 2 * Math.PI);
			
			if(to_highlight && to_highlight.has(node))
				ctx.fill()
			
			ctx.stroke();
			
			const val = isUpper(node.value) ? (node.isNeg ? neg_ch : '') + (Decrypt.get(node.value).includes('<sub>') ? Decrypt.get(node.value)[0] + Decrypt.get(node.value)[6] : Decrypt.get(node.value)) : node.value;
			const view_x = (val.length == 2 || node.value == equiv_ch) ? x - 10 : (val.length == 3) ? x - 15 : x - 5;
			const view_y = y + 4;
			
			ctx.strokeText(val, view_x, view_y);
			
			for(var child of node.children) {
			
				var [x_child, y_child] = [child.x, child.y];
			
				ctx.beginPath();
				ctx.moveTo(x, y + R);
				ctx.lineTo(x_child, y_child - R);
				ctx.stroke();
				
				next_lvl.push(child);
			
			}
		
		}
		
		cur_lvl = [...next_lvl];
	
	}
	
	document.getElementById(edit_id).appendChild(canvas);

}

function lungime(node) {

	if(node.children.length == 0)
		return 1;

	var max_lungime = 0;
	
	for(var child of node.children)
		max_lungime = Math.max(max_lungime, 1 + lungime(child));
		
	return max_lungime;

}

function modify(node) {

	var ans = [];
	
	for(var i = 0; i < node.children.length; ++i) {
		
		var child = node.children[i];
		modify(child);
		
		if((child.value == conjunct_ch || child.value == disjunct_ch) && child.children.length == 1)
			node.children[i] = child.children[0];
			
		child = node.children[i];
		
		if((node.value == disjunct_ch || node.value == conjunct_ch) && (node.value == child.value))
			ans = ans.concat(child.children);
		else
			ans.push(child);
		
	}
	
	node.children = [...ans];
	
}

function treeToString(node, to_underscore) {

	if(node == dummy.children[0]) // Asociativitate
		modify(dummy.children[0]);
		
	var ans = "";
	var child = node.children[0];

	if(isUpper(node.value) || specials.includes(node.value)) // Literal
		ans = (node.isNeg ? neg_ch : '') + (specials.includes(node.value) ? node.value : Decrypt.get(node.value));
		
	else if(node.value == neg_ch) { // Negație
		
		if((isUpper(child.value) || specials.includes(node.value)) && !child.isNeg) { // (¬P) ~ ¬P
		
			node.value = child.value;
			node.isNeg = true;
			node.children = [];
			
			return treeToString(node, to_underscore);
		
		}
		
		ans = neg_ch + treeToString(child, to_underscore);
		
	}
	else { // Disjuncție sau Conjuncție
	
		ans = treeToString(child, to_underscore);
	
		for(var i = 1; i < node.children.length; ++i)
			ans += ' ' + node.value + ' ' + treeToString(node.children[i], to_underscore);
			
	}
	
	if(node != dummy.children[0] && !(isUpper(node.value) || specials.includes(node.value)))
		ans = '(' + ans + ')';
		
	if(to_underscore && to_underscore.has(node))
		ans = '<u>' + ans + '</u>';
		
	return ans;

}

function writeln(operation, to_underscore) {

	drawTree(to_underscore);
	paragraph.innerHTML = treeToString(dummy.children[0], to_underscore);
	
	if(operation) {
	
		paragraph.innerHTML += logic_equiv + '(' + operation + ')';
		paragraph = document.createElement('p');
		document.getElementById(edit_id).appendChild(paragraph);
		
	}

}

function deepCopy(node) {

	var new_node = new Node(node.value);
	
	if(isUpper(node.value) || specials.includes(node.value))
		new_node.isNeg = node.isNeg;
	else
		for(var child of node.children)
			new_node.children.push(deepCopy(child));
	
	return new_node;

}

function remove_equiv(node) {

	if(node.value == equiv_ch) {
	
		writeln('reducere', new Map([[node, true]]));
	
		node.value = conjunct_ch;
		
		var left = new Node(implic_ch);
		left.children = [node.children[0], node.children[1]];
		
		var right = new Node(implic_ch);
		right.children = [deepCopy(node.children[1]), deepCopy(node.children[0])];
	
		node.children = [left, right];
		
	}
	
	for(var child of node.children)
		remove_equiv(child);

}

function remove_impl(node) {

	if(node.value == implic_ch) {
		
		writeln('reducere', new Map([[node, true]]));
	
		node.value = disjunct_ch;
		
		var aux = new Node(neg_ch);
		aux.children = [node.children[0]];
		node.children[0] = aux; 
		
	}
	
	for(var child of node.children)
		remove_impl(child);

}

function remove_neg(node) {

	if(node.value != neg_ch) {
	
		for(var child of node.children)
			remove_neg(child);
			
		return;
		
	}
	
	var child = node.children[0];
	
	if(isUpper(child.value) || specials.includes(child.value)) { // Dublă negație pe propoziție atomică
	
		if(!child.isNeg) {
			
			node.isNeg = true; 
				
			if(specials.includes(child.value)) {
			
				node.value = child.value;
				node.children = [];
				writeln(child.value == tautolog_ch ? 'Propoziție adevărată' : 'Propoziție falsă', new Map([[node, true]]));
				
				node.value = node.value == tautolog_ch ? contradict_ch : tautolog_ch;
				node.isNeg = false;

				return;
			
			}
			
		}
		else
			writeln('Dublă negație', new Map([[node, true]]));
			
		node.value = child.value;
		node.children = [];
	
		return;
	
	}
	
	if(child.value == neg_ch) { // Dublă negație
	
		writeln('Dublă negație', new Map([[node, true]]));
	
		var grand_child = child.children[0];
		
		node.value = grand_child.value;
		node.isNeg = grand_child.isNeg;
		node.children = grand_child.children;
		
		remove_neg(node);
		
		return;
	
	}
	
	writeln('De Morgan', new Map([[node, true]]));
	
	node.value = child.value == disjunct_ch ? conjunct_ch : disjunct_ch; // De Morgan
	node.children = [];
	
	for(var grand_child of child.children) {
	
		var aux = new Node(neg_ch);
		aux.children = [grand_child];
		node.children.push(aux);
	
	}
	
	for(var child of node.children)
		remove_neg(child);

}

function distribute(node) {

	writeln('Distributivitate', new Map([[node, true]]));

	var conector_ch = node.value;  // Distributivitate
	node.value = conector_ch == disjunct_ch ? conjunct_ch : disjunct_ch;

	var nr_children = node.children.length;
	
	var candidates = [];
	
	for(var child of node.children) {
	
		var candid = [];
		
		if(child.children.length == 0)
			candid.push([child.value, child.isNeg]);
		else
			for(var grand_child of child.children)
				candid.push([grand_child.value, grand_child.isNeg]);
				
		candidates.push(candid);
	
	}
	
	var combinations = [];
	
	for(var i = 0; i < nr_children; ++i)
		combinations.push(0);
		
	node.children = [];
		
	while(combinations[0] < candidates[0].length) {
	
		var child = new Node(conector_ch);
	
		for(var i = 0; i < nr_children; ++i) {
		
			var grand_child = new Node(candidates[i][combinations[i]][0]);
			grand_child.isNeg = candidates[i][combinations[i]][1];
			
			child.children.push(grand_child);
		
		}
		
		node.children.push(child);
		
		combinations[nr_children - 1] += 1;
		for(var i = nr_children - 1; i > 0; --i) {
		
			nr_grand_children = candidates[i].length;
			
			if(combinations[i] == nr_grand_children) {
			
				combinations[i] = 0;
				combinations[i - 1] += 1;
			
			}
		
		}
	
	}

}

function simplify(node) {

	for(var i = 0; i < node.children.length; ++i) { // Propoziție A/F
		
		var child_i = node.children[i];
		if(child_i.children.length != 0)
			continue;
				
		if(specials.includes(child_i.value)) { 
			
			if((child_i.value == tautolog_ch && node.value == disjunct_ch) || (child_i.value == contradict_ch && node.value == conjunct_ch)) {
				
				writeln(child_i.value == contradict_ch ? 'Propoziție falsă' : 'Propoziție adevărată', new Map([[node, true]]));
				node.children = [child_i];
				
			}
			else {
			
				writeln(child_i.value == contradict_ch ? 'Propoziție falsă' : 'Propoziție adevărată', new Map([[child_i, true]]));
				node.children.splice(i, 1);
				
			}
			
			modify(dummy);		
			find_to_simplify(dummy.children[0]);
			
			return;
			
		}
		
	}

	for(var i = 0; i < node.children.length; ++i) { // Anihilare
		
		var child_i = node.children[i];
		if(child_i.children.length != 0)
			continue;
			
		for(var j = i + 1; j < node.children.length; ++j) { 
			
			var child_j = node.children[j];
			if(child_j.children.length != 0)
				continue;
				
			if(child_i.value == child_j.value && child_i.isNeg != child_j.isNeg) {
				
				if(j != i + 1) {
				
					writeln('Comutativitate', new Map([[node.children[i + 1], true], [node.children[j], true]]));
					[node.children[i + 1], node.children[j]] = [node.children[j], node.children[i + 1]];
					
				}
				
				writeln('Anihilare', new Map([[node.children[i + 1], true], [node.children[i], true]]));
					
				node.children[i].value = node.value == disjunct_ch ? tautolog_ch : contradict_ch;
				node.children[i].isNeg = false;
				node.children.splice(i + 1, 1);
				modify(dummy);
						
				find_to_simplify(dummy.children[0]);
				
				return;
				
			}
			
		}
		
	}
		
	for(var i = 0; i < node.children.length; ++i) { // Idempotență sau Absorbție
		
		var child_i = node.children[i];
			
		for(var j = 0; j < node.children.length; ++j) { 
			
			var child_j = node.children[j];
				
			if(i == j || child_i.children.length > child_j.children.length)
				continue;
					
			var literals = new Map();
			
			for(var grand_child of child_i.children)
				literals.set(grand_child.value + (grand_child.isNeg ? '*' : ''), true);
					
			if(child_i.children.length == 0)
				literals.set(child_i.value + (child_i.isNeg ? '*' : ''), true);
					
			var other_literals = [];
				
			for(var grand_child of child_j.children)
				if(!literals.has(grand_child.value + (grand_child.isNeg ? '*' : ''))) 
					other_literals.push([grand_child.value, grand_child.isNeg]);
				else if(literals.get(grand_child.value + (grand_child.isNeg ? '*' : '')) == false)
					other_literals.push([grand_child.value, grand_child.isNeg]);
				else
					literals.set(grand_child.value + (grand_child.isNeg ? '*' : ''), false)
						
			if(child_j.children.length == 0) {
				
				if(!literals.has(child_j.value + (child_j.isNeg ? '*' : ''))) 
					other_literals.push([child_j.value, child_j.isNeg]);
				else if(literals.get(child_j.value + (child_j.isNeg ? '*' : '')) == false)
					other_literals.push([child_j.value, child_j.isNeg]);
				else
					literals.set(child_j.value + (child_j.isNeg ? '*' : ''), false)
				
			}
				
			if(literals.size + other_literals.length == Math.max(child_j.children.length, 1)) { 
				
				// Comutativitate părinți
				
				if(i > j) {
					
					writeln('Comutativitate', new Map([[node.children[i], true], [node.children[j], true]]));
					[node.children[i], node.children[j]] = [node.children[j], node.children[i]];
					[i, j] = [j, i];
						
				}
					
				if(i + 1 != j) {
				
					writeln('Comutativitate', new Map([[node.children[i + 1], true], [node.children[j], true]]));
					[node.children[i + 1], node.children[j]] = [node.children[j], node.children[i + 1]];
					
				}
					
				if(child_j.children.length != 0) {  // Comutativitate copii
				
					var k = 0; 
					var to_commute = false;
					
					for(const [val, _] of literals.entries()) {
					
						if(!to_commute && child_j.children[k].value + (child_j.children[k].isNeg ? '*' : '') != val) {
						
							to_commute = true;
							writeln('Comutativitate', new Map([[child_j, true]]));
							
						}
						
						child_j.children[k].value = val[0];
						child_j.children[k].isNeg = val.length == 2 ? true : false;
						k++;
					
					}
					
					for(var it = k; it < child_j.children.length; ++it) {
					
						if(!to_commute && (child_j.children[it].value != other_literals[it - k][0] || child_j.children[it].isNeg != other_literals[it - k][1])) {
						
							to_commute = true;
							writeln('Comutativitate', new Map([[child_j, true]]));
							
						}
					
						child_j.children[it].value = other_literals[it - k][0];
						child_j.children[it].isNeg = other_literals[it - k][1];
					
					}
						
				}
						
				writeln(other_literals.length == 0 ? 'Idempotență' : 'Absorbție', new Map([[node.children[i], true], [node.children[i + 1], true]])); // Idempotență == Absorbție cu 1 termen din dreapta
					
				node.children.splice(i + 1, 1);
				modify(dummy);
						
				find_to_simplify(dummy.children[0]);
				
				return;
					
			}
			
		}
		
	}

	for(var i = 0; i < node.children.length; ++i) { // Distributivitate inversă + Anihilare
	
		var child_i = node.children[i];
			
		for(var z = 0; z < child_i.children.length; ++z)
			for(var j = 0; j < node.children.length; ++j) { 
	
				var child_j = node.children[j];
				
				if(i == j || child_i.children.length != child_j.children.length)
					continue;
					
				var literals = new Map();
			
				for(var gc = 0; gc < child_i.children.length; ++gc)
					if(gc != z)
						literals.set(child_i.children[gc].value + (child_i.children[gc].isNeg ? '*' : ''), true);
					
				var other_literals = [];
				
				for(var grand_child of child_j.children)
					if(!literals.has(grand_child.value + (grand_child.isNeg ? '*' : ''))) 
						other_literals.push([grand_child.value, grand_child.isNeg]);
					else if(literals.get(grand_child.value + (grand_child.isNeg ? '*' : '')) == false)
						other_literals.push([grand_child.value, grand_child.isNeg]);
					else
						literals.set(grand_child.value + (grand_child.isNeg ? '*' : ''), false)
					
				if(other_literals.length == 1 && child_i.children[z].value == other_literals[0][0] && child_i.children[z].isNeg != other_literals[0][1]) { 
				
					// Comutativitate părinți
				
					if(i > j) {
					
						writeln('Comutativitate', new Map([[node.children[i], true], [node.children[j], true]]));
						[node.children[i], node.children[j]] = [node.children[j], node.children[i]];
						[i, j] = [j, i];
						
					}
					
					if(i + 1 != j) {
					
						writeln('Comutativitate', new Map([[node.children[i + 1], true], [node.children[j], true]]));
						[node.children[i + 1], node.children[j]] = [node.children[j], node.children[i + 1]];
						
					}
					
					var k = 0; 
					var to_commute = false; // Comutativitate copii
					
					for(const [val, _] of literals.entries()) {
					
						if(!to_commute && (child_j.children[k].value + (child_j.children[k].isNeg ? '*' : '') != val || child_i.children[k].value + (child_i.children[k].isNeg ? '*' : '') != val)) {
						
							to_commute = true;
							writeln('Comutativitate', new Map([[child_j, true]]));
							
						}
						
						child_i.children[k].value = val[0];
						child_i.children[k].isNeg = val.length == 2 ? true : false;
						child_j.children[k].value = val[0];
						child_j.children[k].isNeg = val.length == 2 ? true : false;
						k++;
					
					}
					
					child_i.children[k].value = other_literals[0][0];
					child_i.children[k].isNeg = other_literals[0][1] ? false : true;
					child_j.children[k].value = other_literals[0][0];
					child_j.children[k].isNeg = other_literals[0][1];
					
					writeln('Distributivitate', new Map([[node.children[i], true], [node.children[i + 1], true]])); // Distributivitate
					
					var last = node.children[i].children.pop();
					var reverse_last = new Node(last.value);
					reverse_last.isNeg = last.isNeg ? false : true;
					
					var new_node = new Node(node.value);
					new_node.children = [last, reverse_last];
					node.children[i].children.push(new_node);
					
					node.children.splice(i + 1, 1); 
					modify(dummy);
						
					find_to_simplify(dummy.children[0]);
					
					return;
					
			}
			
		}
	
	}

	for(var i = 0; i < node.children.length; ++i) { // Distributivitate + Anihilare
		
		var child_i = node.children[i];
		if(child_i.children.length != 0)
			continue;
			
		for(var j = 0; j < node.children.length; ++j) { 
		
			var child_j = node.children[j];
			if(child_j.children.length == 0)
				continue;
				
			var poz_j = 0;
			
			for(var k = 0; k < child_j.children.length; ++k)
				if(child_j.children[k].value == child_i.value)
					poz_j = k;
			
			if(child_j.children[poz_j].value == child_i.value) {
			
				// Comutativitate părinți
				
				if(i > j) {
					
					writeln('Comutativitate', new Map([[node.children[i], true], [node.children[j], true]]));
					[node.children[i], node.children[j]] = [node.children[j], node.children[i]];
					[i, j] = [j, i];
						
				}
					
				if(i + 1 != j) {
				
					writeln('Comutativitate', new Map([[node.children[i + 1], true], [node.children[j], true]]));
					[node.children[i + 1], node.children[j]] = [node.children[j], node.children[i + 1]];
					
				}
				
				if(poz_j != 0) { // Comutativitate copii
				
					writeln('Comutativitate', new Map([[child_j.children[0], true], [child_j.children[poz_j], true]]));
					[child_j.children[0], child_j.children[poz_j]] = [child_j.children[poz_j], child_j.children[0]];
				
				}
				
				writeln('Distributivitate', new Map([[node.children[i], true], [node.children[i + 1], true]]));
				
				var left_node = new Node(node.value);
				left_node.children = [new Node(child_i.value), new Node(child_j.children[0].value)];
				left_node.children[0].isNeg = child_i.isNeg;
				left_node.children[1].isNeg = child_j.children[0].isNeg;
				
				var right_node = new Node(node.value);
				right_node.children = [new Node(child_i.value), child_j];
				right_node.children[0].isNeg = child_i.isNeg;
				
				var change_node = new Node(node.value == disjunct_ch ? conjunct_ch : disjunct_ch);
				change_node.children = [left_node, right_node];
				
				node.children[i] = change_node;
					
				node.children.splice(i + 1, 1); // Distributivitate
				child_j.children.splice(0, 1);
				modify(dummy);
						
				find_to_simplify(dummy.children[0]);
				
				return;
			
			}
		
		}
			
	}

}

function find_to_simplify(node) {

	for(var i = 0; i < node.children.length; ++i) { // Propoziție A/F
		
		var child_i = node.children[i];
		if(child_i.children.length != 0)
			continue;
				
		if(specials.includes(child_i.value)) { 
			
			if((child_i.value == tautolog_ch && node.value == disjunct_ch) || (child_i.value == contradict_ch && node.value == conjunct_ch)) {
				
				writeln(child_i.value == contradict_ch ? 'Propoziție falsă' : 'Propoziție adevărată', new Map([[node, true]]));
				node.children = [child_i];
				
			}
			else {
			
				writeln(child_i.value == contradict_ch ? 'Propoziție falsă' : 'Propoziție adevărată', new Map([[child_i, true]]));
				node.children.splice(i, 1);
				
			}
			
			modify(dummy);		
			find_to_simplify(dummy.children[0]);
			
			return;
			
		}
		
	}

	for(var i = 0; i < node.children.length; ++i) {
	
		var child = node.children[i];
		
		if(lungime(child) >= 2)
			find_to_simplify(child);
			
		if(!treeToString(dummy.children[0]).includes(treeToString(node)))
			return;
	
	}
	
	if(node.children.length == 1)
		return;
	
	if(lungime(node) > 3){
		
		for(var i = 0; i < node.children.length; ++i) {
		
			var child = node.children[i];
		
			if(lungime(child) == 3) {
			
				distribute(child);
				modify(dummy);
				find_to_simplify(dummy.children[0]);
				return;
				
			}
			
		}
	}
	
	simplify(node);

}

function FNN() {

	dummy = new Node('-');
	dummy.children = [t];
	
	paragraph = document.createElement('p');
	paragraph.innerHTML = initial_str;
	document.getElementById(edit_id).appendChild(paragraph);
	
	if(initial_str != treeToString(dummy.children[0])) {
	
		drawTree();
		paragraph.innerHTML += logic_equiv + '(reformatare)';
		paragraph = document.createElement('p');
		document.getElementById(edit_id).appendChild(paragraph);
	}
	
	remove_equiv(dummy.children[0])
		
	remove_impl(dummy.children[0])
		
	remove_neg(dummy.children[0]);
	
	find_to_simplify(dummy.children[0]);
	t = dummy.children[0];
	
	writeln();

}

function transform(results) {
	
	tableFND(results);
	
	if(document.getElementById("myTransforms").checked || document.getElementById("myTransformsWithTree").checked) {
	
		var ids = ["myFNN", "myFND", "myFNC"];
		
		for(var id of ids) {
		
			div_element = document.createElement('div');
			div_element.setAttribute("id", id);
			div_element.setAttribute("class", id);
			document.getElementById("myOutput").appendChild(div_element);
			
			document.getElementById("myOutput").appendChild(document.createElement('br'));
			
			paragraph = document.createElement('p');
			paragraph.innerHTML = '<b>' + id.substring(2) + ' prin transformări: </b>' ;
			document.getElementById(id).appendChild(paragraph);
		
		}
	
		edit_id = ids[0]; FNN();
		
		var formula = treeToString(dummy.children[0]);
		var len = lungime(t);
		
		if(lungime(t) <= 2) {
		
			edit_id = ids[1]; paragraph = document.createElement('p'); document.getElementById(edit_id).appendChild(paragraph); writeln(); 
			edit_id = ids[2]; paragraph = document.createElement('p'); document.getElementById(edit_id).appendChild(paragraph); writeln();
	
		}
		else {
	
			edit_id = ids[t.value == disjunct_ch ? 2 : 1];
			paragraph = document.createElement('p');
			document.getElementById(edit_id).appendChild(paragraph);
			distribute(dummy.children[0]);
			find_to_simplify(dummy.children[0]);
			t = dummy.children[0];
			paragraph.innerHTML = treeToString(dummy.children[0]);
			drawTree();
			
			edit_id = ids[t.value == disjunct_ch ? 2 : 1];
			paragraph = document.createElement('p');
			paragraph.innerHTML = lungime(t) < len ? treeToString(dummy.children[0]) : formula;
			document.getElementById(edit_id).appendChild(paragraph);
			drawTree();
	
		}
		
	}
	
}

function eval(op, x, y) {

	let b_x = x == 'A' ? true : false;
	let b_y = y == 'A' ? true : false;
	let ans = true;
	
	if (op == neg_ch)
		ans = !b_x;
	else if(op == conjunct_ch)
		ans = b_x && b_y;
	else if(op == disjunct_ch)
		ans = b_x || b_y;
	else if(op == equiv_ch)
		ans = b_x == b_y;
	else if(b_x == true && b_y == false)
		ans = false;
		
	if(ans == false)
		return 'F';
		
	return 'A';

} 

function findType(results) {

	let pos_A = -1;
	let pos_F = -1;
	
	for(let i = results.length - 1; i >= 0; i--) {
		if(results[i] == 'A')
			pos_A = i;
		if(results[i] == 'F')
			pos_F = i;
	}
	
	let ans = '';
	
	if(pos_F == -1)
		ans += 'Formula este validă și satisfiabilă. Valorile sub toate interpretările ale formulei sunt adevărate.';
	else if(pos_A == -1)
		ans += 'Formula este nevalidă și nesatisfiabilă. Valorile sub toate interpretările ale formulei sunt false.';
	else
		ans += 'Formula este nevalidă (există interpretarea ' + pos_F + ' pentru care valoare formulei este falsă) și satifsiabilă (există interpretarea ' + pos_A + ' pentru care valoarea formulei este adevărată).';
	
	paragraph = document.createElement("p");
	paragraph.innerHTML = 'Rezultat: ' + ans;
	
	if(document.getElementById("myTable").checked)
		document.getElementById("myOutput").appendChild(paragraph);

}

function buildTable (table) {
	
	let nr_leafs = 0;
	let nr_atomi = 0;
	while(nr_leafs < Chunks.length && Chunks[nr_leafs].length == 1) {
		if(!specials.includes(Chunks[nr_leafs]))
			nr_atomi += 1;
		nr_leafs += 1;
	}
		
	let results = [];
		
	for(let repr = 0; repr < (1 << nr_atomi); repr++) {
		
		let row = document.createElement("tr");
		let pos = 1 << (nr_atomi - 1);
		let Chunks_values = [];
		
		for(let i = 0; i < nr_leafs; i++) {
		
			let cell = document.createElement("td");
			let val;
			
			if(specials.includes(Chunks[i]))
				val = Chunks[i] == '⊥' ? 'F' : 'A';
			else {
				val = (repr & pos) == 0 ? 'F' : 'A';
				pos >>= 1;
			}
			
			cell.innerHTML = val == 'A' ? 1 : 0;
			Chunks_values.push(val);
			if(Chunks.length == 1 && i == Chunks.length - 1)
				results.push(val);
			
			row.appendChild(cell);
			
		}
		
		for(let i = nr_leafs; i < Chunks.length; i++) {
		
			let cell = document.createElement("td");
			
			let op, l, r;
			[op, l, r] = [Chunks_parts[i][0], Chunks_parts[i][1], Chunks_parts[i][2]];
			
			const val = eval(op, Chunks_values[l], Chunks_values[r]);
			cell.innerHTML = val == 'A' ? 1 : 0;
			Chunks_values.push(val);
			if(i == Chunks.length - 1)
				results.push(val);
			
			row.appendChild(cell);
			
		}
		
		table.appendChild(row);
	
	}
	
	findType(results);
	
	if(document.getElementById("myTable").checked)
		document.getElementById("myOutput").appendChild(table);
		
	transform(results);

}

function buildTableHeader () {

	let table = document.createElement("table");
	let header = document.createElement("tr");
	
	for(let Chunk of Chunks) {
	
		let cell = document.createElement("th");
		
		var ans = Chunk;
		for(const [key, value] of Decrypt)
			ans = ans.replaceAll(key, value);

		cell.innerHTML = ans;
		
		header.appendChild(cell);
		
	}
	
	table.appendChild(header);
	
	buildTable(table);

}

function formula_size (str) {

	let nr = 0;
	
	for(let ch of str)
		if(conects.includes(ch) || ch == neg_ch || isUpper(ch))
			nr += 1;
		else if(specials.includes(ch))
			nr += 1.00001;
			
	return nr;

}

function sortChunks () {
	
	let old_Chunks = [...Chunks];
	
	Chunks.sort(function(x, y) {
		if(formula_size(x) > formula_size(y))
			return 1;
		else if(formula_size(x) < formula_size(y))
			return -1;
		return 0;
	});
	
	let new_Chunks_hash = new Map();
	
	for(let i = 0; i < Chunks.length; i++)
		new_Chunks_hash.set(Chunks[i], i);
	
	Chunks_parts.sort(function(x, y) {
		if(formula_size(x[3]) > formula_size(y[3]))
			return 1;
		else if(formula_size(x[3]) < formula_size(y[3]))
			return -1;
		return 0;
	});
		
	for(let i = 0; i < Chunks_parts.length; i++) {
		Chunks_parts[i][1] = new_Chunks_hash.get(old_Chunks[Chunks_parts[i][1]]);
		Chunks_parts[i][2] = new_Chunks_hash.get(old_Chunks[Chunks_parts[i][2]]);
	}
	
}

function buildIntervals(node) {

	if(node.value == neg_ch)
		node.r = buildIntervals(node.children[0])[1] + 1;
		
	else if(conects.includes(node.value)) {
	
		node.l = buildIntervals(node.children[0])[0] - 1;
		node.r = buildIntervals(node.children[1])[1] + 1;
		
	}
	
	return [node.l, node.r];
	
}

function dfs(node) {

	const substr = str.substring(node.l, node.r);

	if(Chunks_hash.has(substr))
		return Chunks_hash.get(substr);
		
	let left_chunk = 0;
	let right_chunk = 0;
	
	left_chunk = dfs(node.children[0]);
	if(node.value != neg_ch)
		right_chunk = dfs(node.children[1]);
	
	const chk_len = Chunks.length;
	Chunks.push(substr);
	Chunks_parts.push([node.value, left_chunk, right_chunk, substr]);
	Chunks_hash.set(substr, chk_len);
	
	
	return Chunks_hash.get(substr);

}

function buildChunks () {
	
	const root = t;
	buildIntervals(root);
	dfs(root);
	sortChunks();
	
	buildTableHeader();

}

function buildTree (str) {

	const con = 'conector logic';
	const prop = 'propoziție';
	const neg = 'negație';
	
	Chunks = [];
	Chunks_parts = [];
	Chunks_hash.clear();
	
	t = new Node(prop, null);
	let node = t;
	
	const right_expr = 'Este o formulă propozițională bine formată';
	const wrong_expr = 'Nu este o formulă propozițională bine formată';
	let ans = right_expr;
	
	let k = 0;
	let i = 0;
	let found_answer = 0;
	
	for(i = 0; i < str.length; i++) {
		const ch = str[i];
		if(ch == ' ')
			continue;
		if(node == 'final')
			break;
		if(ch == '(') {
			
			if(node.value != prop) {
				ans = wrong_expr;
				found_answer = 1;
				break;
			}
			
			if(i < str.length && str[i + 1] == neg_ch) {
				
				node.value = neg;
				node.children = [new Node(prop, node)];
				
			}
			else {
				
				node.value = con;
				node.children = [new Node(prop, node), new Node(prop, node)];
				node = node.children[0];
				
			}
			
		}
		else if(ch == ')') {
		
			if(node.value.length > 1) {
				ans = wrong_expr;
				found_answer = 1;
				break;
			}
			
			if(node == t)
				node = 'final';
			else
				node = node.parent;
			
		}
		else if(conects.includes(ch)) {
		
			if(node.value != con) {
				ans = wrong_expr;
				found_answer = 1;
				break;
			}
			
			node.value = ch;
			node = node.children[1];
			
		}
		else if(isUpper(ch) || specials.includes(ch)) {
		
			if(node.value != prop) {
				ans = wrong_expr;
				found_answer = 1;
				break;
			}
			
			node.l = i;
			node.r = i + 1;
			node.value = ch;
			
			if(!Chunks_hash.has(node.value)) {
				const chk_len = Chunks.length;
				Chunks.push(node.value);
				Chunks_parts.push(['∧', chk_len, chk_len, node.value]);
				Chunks_hash.set(node.value, chk_len);
			}
			
			if(node == t)
				node = 'final';
			else
				node = node.parent;
			
		}
		else if(ch == neg_ch) {
		
			if(node.value != neg) {
				ans = wrong_expr;
				found_answer = 1;
				break;
			}
		
			node.l = i - 1;
			node.value = neg_ch;
			node = node.children[0];
			
		}
		else {
			ans = wrong_expr + '. S-a întâlnit caracter invalid la indexul ' + k.toString() + '.';
			found_answer = 1;
			break;
		}
		
		k++;
		
	}
	
	if(found_answer == 0) {
		if(node != 'final')
			ans = wrong_expr + '. Marcherul mai este prezent în arbore.';
		else if(i != str.length)
			ans = wrong_expr + '. Marcherul a ieșit din arbore înainte să se termine stringul.';
	}
	
	paragraph = document.createElement("p");
	
	if(ans == right_expr)
		buildChunks();
	else {
	
		paragraph.innerHTML = 'Rezultat: ' + ans;
		document.getElementById("myOutput").appendChild(paragraph);
		
	}

}

function buildExpression (ex_number = -1, tpa_val = -1) {

	document.getElementById("myOutput").innerHTML = "";

	const tpa = [
		['(P ⇒ Q) ∧ ¬Q ∧ ¬P', '(P ⇒ Q) ⇒ ((Q ⇒ S) ⇒ ((P ∨ Q) ⇒ R))', '¬(P ⇒ Q) ⇔ ((P ∨ Q) ∧ (¬P ⇒ Q))', '(P ⇔ Q) ⇔ (¬(P ⇒ ¬Q))'],
		['(¬P ⇒ (Q ∧ R)) ⇒ ((Q ∨ ¬R) ⇔ P)', '(P ∨ ¬Q ∨ (R ⇔ S)) ⇔ (S ∧ Q)', '(P ⇔ (P ∧ Q)) ⇒ ¬Q', '¬(¬P ∨ Q ∨ R) ∨ (Q ⇒ (P ∨ ¬R))', '(¬P ∨ Q ∨ R) ∧ (P ∨ ¬R) ∧ (¬Q ∨ ¬R) ∧ ¬(P ∧ R)'],
		['((P1 ⇒ (P2 ∨ P3)) ∧ (¬P1 ⇒ (P3 ∨ P4)) ∧ (P3 ⇒ (¬P6)) ∧ (¬P3 ⇒ (P4 ⇒ P1)) ∧ (¬(P2 ∧ P5)) ∧ (P2 ⇒ P5)) ⇒ ¬(P3 ⇒ P6)'],
		['(P ∨ Q1) ∧ (¬P ∨ Q2) ⇒ (Q1 ∨ Q2)'],
		['((((((P ∧ Q) ⇒ R) ∧ ((¬P) ⇒ S)) ∧ ((¬Q) ⇒ T)) ∧ (¬R)) ∧ (U ⇒ ((¬S) ∨ (¬T))))']
	];

	if(tpa_val == -1)
		str = document.getElementById("myText").value;
	else {
		str = tpa[ex_number][tpa_val];
		document.getElementById("myText").value = str;
	}
	
	initial_str = str;
	
	Encrypt.clear();
	Decrypt.clear();
	
	const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'U', 'V', 'W', 'X', 'Y', 'Z'];
	var nr_letters = 0;
	
	for(var i = 0; i < str.length; ++i)
		if(isUpper(str[i])) {
		
			var key = str[i];
			if(i < str.length - 1 && '0' <= str[i + 1] && str[i + 1] <= '9')
				key += '<sub>' + str[i + 1] + '</sub>';
			
			if(!Encrypt.has(key)) {
			
				Encrypt.set(key, letters[nr_letters]);
				Decrypt.set(letters[nr_letters], key);
				nr_letters += 1;
			
			}
			
			str = str.substring(0, i) + Encrypt.get(key) + str.substring(i + (key.length > 1 ? 2 : 1));
		
		}
	
	const li = ['¬', '∧∨', '⇒', '⇔'];
	for(let k  = 0; k < li.length; k++) {
		
		let op = 0;
		
		for(i = str.length - 1; i >= 0; i -= 1) {
		
			if(!li[k].includes(str[i]))
				continue;
			
			let l = i - 1;
			let p = 0;
			let found_letter = (li[k][0] == neg_ch);
			while(0 <= l && (!found_letter || p != 0)) {
				if(isUpper(str[l]) || specials.includes(str[l]) )
					found_letter = true;
				if(str[l] == '(')
					p += 1;
				if(str[l] == ')')
					p -= 1;
				l -= 1;
			}
			
			let r = i + 1;
			p = 0;
			found_letter = false;
			while(r < str.length && (!found_letter || p != 0)) {
				if(isUpper(str[r]) || specials.includes(str[r]))
					found_letter = true;
				if(str[r] == '(')
					p += 1;
				if(str[r] == ')')
					p -= 1;
				r += 1;
			}
			
			if(str[l] == '(' && str[r] == ')')
				continue;
			
			str = str.substring(0, l + 1) + '(' + str.substring(l + 1, r) + ')' + str.substring(r, str.length);
			
		}
		
	}
	
	buildTree(str);

}
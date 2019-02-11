(function () {
  const v = [];
  const k = { "values": [] };
  $('.drinklist li tr').each(function (x, y) {
    const drink = $(this).children('td').slice(1, 2).html()
    console.log(drink);
    if (drink && drink !== "&nbsp;") {
      v.push(drink);
      k.values.push(
        { value: drink, expressions: [drink] }
      );

    }
  })
  console.log(v);
  console.dir(k);

  k.values.forEach(drink => {
    console.log(`{"value": "${drink.value}", "expressions": "[${drink.value}]" }`);
  });
})()
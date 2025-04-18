function! InsertImg()
    echo "Inserting"
    let l:cmd = '!['
    let l:cmd .= trim(getreg('+'))
    let l:cmd .= '](' . expand('%:t:r') . '/.jpg)'
    execute 'normal! i' . cmd
    execute 'normal! 4h'
    startinsert
endfunction

nmap <Tab> :call InsertImg() <CR>

$CertCollection = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2Collection
$AuthCertBytes = [System.Convert]::FromBase64String("$(vscode-esrp)")
$CertCollection.Import($AuthCertBytes, $null, [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::Exportable -bxor [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::PersistKeySet)
$RequestSigningCertIndex = $CertCollection.Count
$RequestSigningCertBytes = [System.Convert]::FromBase64String("$(c24324f7-e65f-4c45-8702-ed2d4c35df99)")
$CertCollection.Import($RequestSigningCertBytes, $null, [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::Exportable -bxor [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::PersistKeySet)
$CertStore = New-Object System.Security.Cryptography.X509Certificates.X509Store("My","LocalMachine")
$CertStore.Open("ReadWrite")
$CertStore.AddRange($CertCollection)
$CertStore.Close()
$AuthCertSubjectName = $CertCollection[0].Subject
$RequestSigningCertSubjectName = $CertCollection[$RequestSigningCertIndex].Subject
Write-Host "##vso[task.setvariable variable=RELEASE_AUTH_CERT_SUBJECT_NAME]$AuthCertSubjectName"
Write-Host "##vso[task.setvariable variable=RELEASE_REQUEST_SIGNING_CERT_SUBJECT_NAME]$RequestSigningCertSubjectName"
